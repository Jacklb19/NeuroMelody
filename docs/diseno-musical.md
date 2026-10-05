# Diseño musical — NeuroMelody

Criterios musicales del motor de adaptación (RF-08, RF-09, RF-10). Los valores de la tabla son iniciales y se ajustarán con 3 a 5 oyentes al cerrar el S4.

## Principio iso

1. **Acompañar.** Durante los primeros 3 a 5 minutos, la música corresponde al estado estimado de la persona, sin intentar cambiarlo.
2. **Guiar.** Después, la música avanza **un escalón por vez** hacia la meta (activación baja).
3. **Volver a acompañar.** Si la activación sube (cambio de estado aceptado tras la histéresis), la música regresa al nivel que corresponde al nuevo estado y el ciclo empieza de nuevo.

El motor nunca salta más de un escalón en una transición, y toda transición es gradual (RF-10, HU-04).

## Reglas de la guía

"Intermedio" es un escalón de la guía, no un estado estimado: el clasificador solo estima activación alta, baja o incierta.

1. **Calibración.** Los primeros 3 minutos de señal se usan para la línea base, con al menos 12 publicaciones válidas y de buena calidad. Si faltan, continúa la calibración en Intermedio hasta reunirlas.
2. **Primera estimación.**
   - Alta: pasa al nivel Activación alta (acompañar).
   - Baja o Incierta: espera la permanencia mínima antes de avanzar.
3. **Duración mínima.** El avance espera 3 minutos en el reloj de audio desde el comienzo de la última transición. Acelerar la señal no acelera las rampas ni la permanencia.
4. **Avance.** Se avanza un escalón hacia la meta cuando vence la permanencia, hay buena calidad y ninguna de las últimas 3 estimaciones fue Alta. Incierta cuenta como «sin Alta».
5. **Retroceso.** Si la histéresis acepta Alta, se sube un escalón inmediatamente, incluso durante la permanencia o una rampa. Se reprograma desde los valores actuales, sin saltos ni apilar rampas, y se reinicia la permanencia.
6. **Incierta y calidad.** Incierta nunca provoca retrocesos. La calidad insuficiente bloquea transiciones y rompe candidaturas pendientes. Al vencer la permanencia se decide con datos vigentes, sin cambios obsoletos en cola.

Estas prioridades reemplazan las anteriores por decisión explícita del usuario del 5 de octubre de 2026. El estimador temporal compara FC ±10 % y RMSSD ∓20 % con la línea base; no es una probabilidad calibrada. Histéresis: 3 estimaciones consecutivas también para Incierta. RNF-02 se verifica desde la aceptación de Alta; sigue pendiente aclarar el conflicto entre la latencia de Baja y la permanencia obligatoria del avance.

## Niveles musicales (valores iniciales)

| Nivel | Tempo | Modo | Capas | Brillo | Reverberación |
|---|---|---|---|---|---|
| Activación alta | 76 BPM, bajando a 66 en la guía | Pentatónica mayor | 3 | Medio | Media |
| Intermedio | 66 BPM | Pentatónica mayor o lidio | 2 o 3 | Medio-bajo | Media-alta |
| Activación baja (meta) | 58 a 60 BPM | Bordón y pentatónica | 1 o 2 | Bajo (pasa bajos cerca de 2 kHz) | Alta |

### Valores concretos (aprobados el 29 sep, en `src/features/audio/engine/levels.ts`)

| Nivel | Tempo | Modo | Capas | Pasa bajos | Reverberación (mezcla) |
|---|---|---|---|---|---|
| Activación alta | 76 BPM | Pentatónica mayor | 3 (bordón, armonía, melodía) | 6 kHz | 0,25 |
| Intermedio | 66 BPM | Lidio | 2 (bordón, armonía) | 3,5 kHz | 0,35 |
| Activación baja (meta) | 59 BPM | Bordón con pentatónica | 2 (bordón, díadas abiertas) | 2 kHz | 0,5 |

- **Tónica:** re3 (≈ 146,8 Hz). El bordón suena una octava abajo, en re2, con su quinta.
- **Notas compartidas:** la pentatónica mayor de re (re, mi, fa#, la, si) está contenida en el lidio de re (re, mi, fa#, sol#, la, si, do#). Por eso, en un fundido entre Activación alta e Intermedio, los dos bancos de voces comparten notas y la transición no introduce choques armónicos.
- **Ciclo armónico:** 16 pulsos. La armonía cambia cada 4 pulsos.

## Reglas de transición

- **Centro tonal:** fijo durante toda la sesión.
- **Modo:** cambia solo entre niveles, con un fundido cruzado de capas de 30 s que empieza al cerrar el ciclo armónico en curso.
- **Tempo:** rampa de duración = máx(20 s, |ΔBPM| × 2 s). Por ejemplo, de 76 a 66 BPM dura 20 s y de 66 a 58 BPM dura 20 s. Así se cumple RNF-03 (ninguna rampa de tempo menor de 20 s) y el ritmo de "un pulso por minuto cada dos segundos" del documento de definición.
- **Brillo y reverberación:** se interpolan en 30 a 60 s.
- **Todos los parámetros** se aplican como automatización de `AudioParam` en el hilo de audio, nunca con temporizadores del hilo principal.

## Ajuste con oyentes (cierre del S4)

Con 3 a 5 oyentes se revisarán el tempo de cada nivel, el número de capas, el brillo y la reverberación, y la duración de los fundidos. Los cambios se anotarán en este documento con la fecha y el motivo.
