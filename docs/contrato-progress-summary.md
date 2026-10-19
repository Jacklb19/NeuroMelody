# Contrato de explicación del progreso (ADR-48)

19 oct 2026. Desarrollo local autorizado dentro del bloque 23. RF-16, RNF-07; amplía ADR-08/36. No requiere tablas, migraciones ni dependencias. Misma rama `feat/block-23` en ambos repositorios.

`POST /v1/progress/summary`: cuenta autenticada y consentimiento de esta petición. Sigue la regla del resumen agregado existente: no lee recursos guardados, no necesita que estén sincronizados, no devuelve datos ajenos y no almacena nada. Errores existentes: 401 `unauthenticated`, 403 `consent_required`, 422 `invalid_request`, 502 `language_model_unavailable`. CORS vigente, sin orígenes nuevos.

Cuerpo cerrado: `consent` booleano estricto, `locale` es/en, `observations` entre 1 y 3 elementos. Cada observación:

| Campo | Valores |
|---|---|
| `id` | o1, o2 u o3; sin duplicados |
| `dimension` | instrument, ambience, hour, duration, goal, plannedDuration |
| `metric` | rating o pulse |
| `goals` | Catálogo vigente, sin duplicados; vacío para comparar intenciones |
| `program_version` | 0 (antigua desconocida) o 1; 0 no admite contexto reconstruido |
| `source` | null para valoración; ble o camera para pulso |
| `groups` | Exactamente dos grupos con opciones distintas |
| grupo `option` | Instrumentos warm/piano/bowls; ambientes none/rain/sea/wind; horas night/morning/afternoon/evening; tiempo short/medium/long/extended; intenciones como ids separados por coma o vacío; planes 10/15/20/30/45/60 |
| grupo `count` | Entero estricto de 5 a 100000 |
| grupo `median` | Número finito con un decimal; −10…10 puntos o −300…300 lat/min |

Nada de notas, fechas, ids de sesiones, imágenes o señal. El servidor valida forma y límites; no puede certificar que las cifras del navegador correspondan a sesiones reales.

Para validar de forma completa el lenguaje y las referencias, se acota la redacción: el modelo elige `framing` (overview o balance) y devuelve todos los `observation_ids` recibidos, en el mismo orden, sin otros campos. La respuesta al cliente añade `generated: true` y `model`. No se acepta prosa libre del proveedor: las frases explicativas traducidas están revisadas en la interfaz y las comparaciones conservan exactamente sus cifras locales. Esta restricción evita depender de una lista de palabras prohibidas para detectar causalidad o cifras inventadas. La interfaz explica este alcance antes del consentimiento y marca el resultado automático.

Sin red o respuesta válida se mantienen las observaciones locales. La explicación se invalida al cambiar cualquier registro del historial, filtro, idioma o cuenta, incluso si las tres comparaciones visibles coinciden; tampoco se acepta una respuesta tardía de un estado anterior. Solo vive en memoria durante esa vista. Las credenciales reales y el guardado en servicios externos no se usan en pruebas.
