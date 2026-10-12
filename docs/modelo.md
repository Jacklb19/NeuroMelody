# Clasificador de activación — ficha del modelo

Modelo de aprendizaje automático supervisado que estima, a partir del pulso, si la persona está más activa, cerca de su punto de partida o más tranquila que al empezar (RF-07, ADR-32). No es un modelo generativo y no participa ningún servicio externo: se ejecuta en el navegador.

## Qué es

- **Tipo:** regresión logística multinomial (tres clases), con escalado de las entradas y calibración de la confianza por temperatura.
- **Entradas (3):** frecuencia cardíaca media, RMSSD y SDNN de la ventana de análisis, cada una como logaritmo de su razón respecto a la línea base de la propia persona (los primeros 3 minutos de la sesión).
- **Salida:** uno de los estados `low` («más tranquilo»), `uncertain` («cerca del inicio») o `high` («más activo»), con su probabilidad calibrada.
- **Archivo:** `public/models/activation-classifier.json` (unos 4 KB). Solo números: medias, escalas, pesos, sesgos y temperatura. La app lo ejecuta como aritmética (`src/features/adaptation/classifier/activationModel.ts`), sin WebAssembly ni dependencias.
- **Dónde actúa:** sustituye a las reglas de ADR-12 al estimar el estado de cada lectura. La histéresis de 3 estimaciones, las permanencias y las rampas musicales no cambian. Si el archivo no carga o no pasa la validación, la app usa las reglas y lo dice en pantalla.

## Datos de entrenamiento

**WESAD** (Schmidt, Reiss, Dürichen, Marberger y Van Laerhoven, «Introducing WESAD, a Multimodal Dataset for Wearable Stress and Affect Detection», ICMI 2018). 15 personas grabadas en laboratorio con un sensor de pecho, en reposo, bajo estrés inducido (prueba TSST), viendo vídeos divertidos y en meditación guiada. Uso científico y no comercial, con cita. Los datos no se versionan.

| Condición del estudio | Estado que enseña |
|---|---|
| Meditación guiada | `low` |
| Reposo y vídeos divertidos | `uncertain` |
| Estrés inducido | `high` |

Del electrocardiograma se detectan los latidos y, desde ahí, todo replica a la app: el mismo filtro de latidos, la misma ventana de hasta 5 minutos, una lectura cada 5 segundos y la misma línea base. Resultan 6.722 ejemplos: 1.296 `low`, 3.720 `uncertain` y 1.706 `high`.

## Evaluación

Validación **dejando una persona fuera**: se entrena con 14 personas y se prueba con la que el modelo no ha visto, 15 veces. Mide lo que importa (cómo responde ante alguien nuevo) y evita cifras infladas por mezclar ventanas de una misma persona.

| | Acierto equilibrado | F1 macro | F1 `high` | F1 `uncertain` | F1 `low` |
|---|---|---|---|---|---|
| Reglas de ADR-12 | 62,4 % | 0,64 | 0,67 | 0,78 | 0,48 |
| **Modelo entrenado** | **71,9 %** | **0,71** | **0,81** | **0,77** | **0,53** |
| Bosque aleatorio (referencia, no se entrega) | 65,9 % | 0,65 | 0,73 | 0,73 | 0,49 |

Matriz de confusión del modelo (filas: estado real; columnas: estado predicho; orden `low`, `uncertain`, `high`):

| | `low` | `uncertain` | `high` |
|---|---|---|---|
| **`low`** | 780 | 429 | 87 |
| **`uncertain`** | 741 | 2.736 | 243 |
| **`high`** | 121 | 188 | 1.397 |

Acierto equilibrado por persona: va del 34 % (S2) al 100 % (S13); 11 de 15 personas superan el 65 %.

**Confianza** (tras la calibración): cuando el modelo indica en torno al 94 %, acierta el 90 %; en torno al 57 %, acierta el 75 %; en torno al 47 %, acierta el 60 %. En el tramo del 70 al 85 % acierta el 65 %, algo menos de lo que indica.

## Límites

- **No es una medida clínica.** No mide el dolor ni diagnostica. La app lo sigue diciendo.
- **Pocas personas y de laboratorio:** 15 adultos sanos, no personas con dolor crónico. Los resultados pueden no trasladarse a quien usa la app.
- **«Más tranquilo» es su punto débil:** distingue peor la meditación del reposo (F1 0,53). Detecta mejor la activación.
- **Varía mucho entre personas** (del 34 al 100 %).
- **Sensor distinto:** se entrenó con un electrocardiograma de pecho. Con la cámara del celular, menos precisa, puede rendir peor.
- **Solo tres entradas.** No usa LF/HF, porque la app tarda 2 minutos en tenerlo y no siempre lo tiene.

## Cómo reproducirlo

En `back/training/` (dependencias solo de entrenamiento: numpy, scipy, scikit-learn):

```
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt
.venv/Scripts/python extract.py <carpeta de WESAD con S2 … S17>
.venv/Scripts/python train.py ../../front/public/models/activation-classifier.json
```

La semilla es fija: entrenar de nuevo produce el mismo modelo. Si cambian en la app el filtro de latidos, la ventana o la línea base, hay que cambiar los mismos valores en `features.py` y volver a entrenar. La prueba `activationModel.test.ts` compara las predicciones de la app con las calculadas en Python.
