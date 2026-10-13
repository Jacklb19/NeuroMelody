# Diseño musical — NeuroMelody

Criterios musicales del motor de adaptación (RF-08, RF-09, RF-10). S4 cierra con pruebas automáticas y una escucha del usuario; 3–5 oyentes no bloquean ese cierre. El ajuste posterior con oyentes va en un commit pequeño separado de levels.ts, basado en resultados reales.

**S4 cerrado el 5 de octubre de 2026.** El usuario confirmó la escucha completa con «todo pasó»: inicio, timbre, avance con Incierta, retroceso por Alta, relajación progresiva, continuidad al cambiar de pestaña y detención. Esta confirmación manual complementa las 332 pruebas aprobadas, cobertura de líneas 96,01 %, tipos/lint/build correctos y los 8 E2E Chrome/Edge de la revisión RNF-02. No se cambiaron los valores de levels.ts. La evaluación con 3–5 oyentes sigue posterior y separada; BLE físico, accesibilidad completa y despliegue conservan sus comprobaciones pendientes.

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

Prioridades aprobadas el 5 oct 2026: FC ±10 % y RMSSD ∓20 % respecto a la base, sin probabilidad calibrada, histéresis de 3 también para Incierta. RNF-02: Alta <2 s desde aceptación; avance <2 s desde elegibilidad tras permanencia y calidad/estimaciones vigentes. Pruebas registran ambos intervalos (programación menos aceptación y menos elegibilidad). La interfaz indica que conserva el escalón hasta completar su duración; véase ADR-12. No se modifica la especificación.

### Programas (ADR-38)

Lo que la persona busca decide en qué escalón empieza la música y cuál es el más calmado al que llega. Las reglas de arriba se aplican igual dentro de ese tramo: la calibración ocurre en el escalón inicial y el avance se detiene en el más calmado.

| Objetivo | Empieza en | Llega hasta | Respiración guiada |
|---|---|---|---|
| Relajarme, o ninguno | Intermedio | Meta | Apagada |
| Descansar antes de dormir | Intermedio | Meta | Encendida |
| Recuperar la calma después de una actividad | Activación alta | Meta | Apagada |
| Acompañar una respiración lenta | Meta | Meta | Encendida |
| Tomar una pausa para mí | Intermedio | Intermedio | Apagada |

### El tempo parte del pulso (ADR-39)

El tempo del escalón inicial se mueve al pulso de la persona (hasta +14 y −5 por minuto respecto al de la tabla), con una rampa gradual, a las tres primeras lecturas buenas y otra vez al terminar la calibración. Desde ahí la música baja hacia los 59 de la meta, que no cambian. Ejemplo con pulso de 76 y sesión desde Intermedio: Activación alta 86, Intermedio 76, Meta 59.

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
- **Ciclo armónico:** 16 pulsos. La armonía cambia cada 4 pulsos en Activación alta y cada 8 en Intermedio y en la meta (bloque 17).

## Cómo suena (bloque 17, 12 oct 2026)

**Estado: programado y verificado con pruebas; falta la escucha del usuario.** Los valores de la tabla de niveles y las reglas de la guía no cambiaron: cambió lo que suena dentro de cada nivel y cómo se pasa de uno a otro.

### Qué se encontró antes de cambiar nada

Medido sobre el sonido renderizado (herramienta de abajo), no de oído:

- Entre el 55 % y el 68 % de la energía estaba por debajo de 150 Hz (el bordón en re2 y la2): el altavoz de un celular casi no lo reproduce.
- Nada por encima de 2 kHz y menos del 1 % por encima de 500 Hz en Intermedio y en la meta. Cada nota era una onda pura con un armónico, así que el filtro de brillo de cada nivel no tenía nada que filtrar: los tres niveles sonaban casi con el mismo color.
- El sonido era mono (los dos canales iguales); solo la reverberación abría el espacio.
- Los acordes salían al azar cada 4 pulsos, sin relación entre uno y el siguiente, y se apagaban antes del siguiente: un pulso mecánico.
- La melodía era una nota al azar con un 35 % de probabilidad en cada pulso: saltos sin frase, siempre igual de fuerte y exactamente a tiempo. Además solo existe en Activación alta; Intermedio y la meta, donde transcurre casi toda la sesión, eran un bordón fijo y un acorde.
- Al cambiar de modo, el material nuevo entraba desde cero durante 30 s mientras el anterior se apagaba en unos 4 s: quedaba un hueco de varios segundos con solo el bordón.
- Nada cambiaba a lo largo de la sesión: las mismas probabilidades de principio a fin.

### Qué suena ahora

1. **Timbre** (`core/timbres.ts`, `core/voices.ts`). Cada nota son dos osciladores afinados con una diferencia mínima y repartidos a izquierda y derecha, lo que le da anchura y un vaivén lento. Un tercero les añade armónicos en proporción a lo fuerte que suena la nota: brilla al atacar y se apaga hacia un tono más redondo, como un instrumento. Hay seis timbres: colchón (acordes de cada nivel, tres variantes de más rápido y claro a más lento y oscuro), nota pulsada tipo piano eléctrico suave (melodía), su versión más tenue (notas sueltas del acorde) y campana de cristal (meta). El bordón pasa de dos ondas fijas a cinco parciales (re2, la2, re3, la3, re4), cada uno con su propio vaivén lento; los de arriba lo hacen audible en altavoces pequeños.
2. **Notas** (`core/arrangement.ts`, `core/composer.ts`). Los acordes de cada modo están escritos a mano con sus progresiones, de modo que ninguna voz se mueve más de una cuarta de un acorde al siguiente; se sostienen hasta el acorde siguiente y las notas comunes no se vuelven a atacar. Una prueba comprueba la conducción de voces y que ningún acorde roce con el bordón.
   - *Activación alta:* acordes cerrados cada 4 pulsos y una melodía en frases. Una frase expone un motivo de 3 a 6 notas que se mueve por grados, descansa, y la siguiente lo repite más arriba o más abajo; cada 2 o 3 repeticiones se inventa otro. La última nota de la frase cae en una nota del acorde.
   - *Intermedio:* acordes abiertos cada 8 pulsos, con el sol# que da al lidio su carácter suspendido, y notas sueltas del acorde cada dos pulsos.
   - *Meta:* quintas y cuartas abiertas cada 8 pulsos y campanas espaciadas. Cada campana repite su nota en un bucle de duración distinta (19, 23, 29, 31, 37 y 43 pulsos, sin divisores comunes): notas conocidas que nunca coinciden igual dos veces.
   La actividad baja con la escalera: frases, luego notas del acorde, luego una nota cada varios segundos.
3. **Variación.** Las notas pulsadas no caen exactas sobre la rejilla (hasta 25 ms) ni suenan todas igual de fuerte; las de un acorde entran escalonadas. Tres ciclos lentos de 127, 211 y 337 s (primos, para que no vuelvan a coincidir en una sesión) mueven cuánto se toca, en qué registro y cuán abierto suena el colchón.
4. **Espacio** (`engine/impulseResponse.ts`). La reverberación espera 25 ms antes de responder, para que cada nota se oiga limpia primero, y su cola (3,6 s) pierde agudos a medida que se apaga, como en una sala, en vez de sisear.
5. **Transiciones.** Durante el fundido de 30 s entre modos, el modo saliente sigue tocando hasta quedar en silencio y la curva es de potencia constante: ya no hay hueco. Una capa que se apaga también sigue sonando mientras baja.

### Qué se mantiene

ADR-07 (todo en el AudioWorklet, sin reservar memoria en `process()`, parámetros por `AudioParam`), ADR-12 (escalera, histéresis, permanencias y duración de rampas y fundidos) y ADR-16 (límite de salida). El tempo y el reloj que lee la respiración guiada son los mismos. El nivel percibido (curva A) de cada nivel quedó igual que antes, con picos y nivel eficaz algo más bajos: no suena más fuerte, suena más lleno.

### Cómo oír un cambio antes de integrarlo

`node scripts/audio/renderSamples.ts <etiqueta>` renderiza el sintetizador a archivos WAV en `audio-samples/<etiqueta>/` (sin versionar) con la misma cadena que la sesión —filtro de brillo, reverberación, volumen y recorte—, la misma semilla y los valores de `levels.ts`: cada nivel durante 45 s y el paso de Intermedio a la meta. `audio-samples/escuchar.html` lista todas las etiquetas para compararlas. Junto a cada archivo guarda sus medidas (`metrics.json`): pico, nivel eficaz, nivel percibido, reparto de la energía por bandas y cuán distintos son los dos canales. El limitador no se reproduce: el informe avisa si un archivo lo alcanzaría.

### Pendiente

- La escucha del usuario de cada paso (`0-antes` a `4-espacio`). Lo que no guste se ajusta en una constante o se deshace con su commit.
- El paisaje sonoro de ADR-33 (elegir timbre o ambiente): hay tres bocetos de ambiente (mar, lluvia, viento) en `audio-samples/5-bocetos-de-ambiente/` para decidir si merece la pena. No está programado en la app ni ubicado en `pantallas.md`.

## Reglas de transición

- **Centro tonal:** fijo durante toda la sesión.
- **Modo:** cambia solo entre niveles, con un fundido cruzado de capas de 30 s que empieza al cerrar el ciclo armónico en curso.
- **Tempo:** rampa de duración = máx(20 s, |ΔBPM| × 2 s). Por ejemplo, de 76 a 66 BPM dura 20 s y de 66 a 58 BPM dura 20 s. Así se cumple RNF-03 (ninguna rampa de tempo menor de 20 s) y el ritmo de "un pulso por minuto cada dos segundos" del documento de definición.
- **Brillo y reverberación:** se interpolan en 30 a 60 s.
- **Todos los parámetros** se aplican como automatización de `AudioParam` en el hilo de audio, nunca con temporizadores del hilo principal.

## Ajuste con oyentes posterior a S4 (propuesto)

Con 3 a 5 oyentes se revisarán tempo, capas, brillo/reverberación y fundidos. Cambios con fecha/motivo en commit separado pequeño cuando el usuario entregue resultados. No se cambian valores por escucha simulada. El grupo no bloquea S4, cuya única escucha manual de cierre corresponde al usuario.
