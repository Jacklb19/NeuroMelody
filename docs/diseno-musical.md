# Diseño musical — NeuroMelody

Criterios musicales del motor de adaptación (RF-08, RF-09, RF-10). Los valores de la tabla son iniciales y se ajustarán con 3 a 5 oyentes al cerrar el S4.

## Principio iso

1. **Acompañar.** Durante los primeros 3 a 5 minutos, la música corresponde al estado estimado de la persona, sin intentar cambiarlo.
2. **Guiar.** Después, la música avanza **un escalón por vez** hacia la meta (activación baja).
3. **Volver a acompañar.** Si la activación sube (cambio de estado aceptado tras la histéresis), la música regresa al nivel que corresponde al nuevo estado y el ciclo empieza de nuevo.

El motor nunca salta más de un escalón en una transición, y toda transición es gradual (RF-10, HU-04).

## Reglas de la guía

"Intermedio" es un escalón de la guía, no un estado estimado: el clasificador solo estima activación alta, baja o incierta.

1. **Calibración.** Los primeros 3 minutos suenan en Intermedio, todavía sin estimación. En ese tiempo se toma la línea base de la sesión.
2. **Primera estimación.**
   - Alta: pasa al nivel Activación alta (acompañar).
   - Baja: pasa a la meta.
   - Incierta: se queda en Intermedio.
3. **Duración mínima.** Cada escalón dura como mínimo 3 minutos.
4. **Avance.** Se avanza un escalón hacia la meta solo si ninguna de las últimas 3 estimaciones fue alta.
5. **Retroceso.** Si la histéresis acepta un estado alto, se sube un escalón (volver a acompañar).
6. **Incierta.** Una estimación incierta mantiene el nivel actual.

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
