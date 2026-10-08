# Mapa de pantallas — NeuroMelody

Toda pantalla o panel nuevo se ubica en este mapa; si no encaja, se propone el cambio al mapa antes de construirlo. Este documento no define colores ni estilo visual. La presentación de las cinco pantallas existentes se documenta en [diseno-visual.md](diseno-visual.md); el rediseño conserva sus rutas, paneles y comportamiento.

**Usuarios.** El paciente es el usuario principal. El terapeuta o acompañante usa la misma cuenta y el mismo dispositivo que el paciente, sin rol ni permisos propios: su intervención se limita a las pantallas de plan e historial.

**Sesión de usuario.** Una sesión de escucha con el simulador no exige cuenta. La cuenta (Supabase Auth, con segundo factor TOTP) solo se requiere para sincronizar, ver datos de salud guardados en la nube y usar el modelo de lenguaje.

## Pantallas

| Ruta | Pantalla | Propósito | HU | RF | Sprint | ¿Requiere sesión? | Lleva a |
|---|---|---|---|---|---|---|---|
| `/` | Inicio | Punto de entrada: iniciar una sesión de escucha y acceder al plan, al historial y a la cuenta. | — | — | S3 | No | `/warnings` (si no se aceptaron), `/plan`, `/session`, `/history`, `/account`, `/privacy` |
| `/warnings` | Advertencias de uso | Presentar el carácter no clínico de la aplicación y registrar la aceptación explícita antes de la primera sesión. | — | RF-17 | S3 | No (se guarda en el dispositivo y se sincroniza en `profiles` si hay cuenta) | `/plan`, `/session`, `/privacy` |
| `/plan` | Plan de sesión | Fijar objetivos y duración (10 a 60 minutos) y ver el plan antes de empezar; ajustarlo a mano. En S6 se suma la propuesta del modelo de lenguaje. | HU-07 | RF-13, RF-18 | S3 (plan manual y por defecto), S6 (propuesta del modelo) | No para el plan manual; sí para pedir la propuesta al modelo | `/session`, `/` |
| `/session` | Sesión en curso | Conectar la fuente de señal, escuchar la música adaptada, ver la señal y los indicadores, controlar el volumen y detener. El control de detención está siempre visible. | HU-01, HU-02, HU-03, HU-04, HU-05, HU-06 | RF-01 a RF-12, RF-18 | S1 a S5 | No | `/summary/:id` (al terminar), `/` |
| `/summary/:id` | Resumen de sesión | Mostrar los indicadores de la sesión y el texto en lenguaje llano, marcado como generado automáticamente; permitir la descarga. | HU-08 | RF-15 | S6 | No para los indicadores locales; sí para el texto del modelo y la sincronización | `/history`, `/` |
| `/history` | Historial | Revisar sesiones anteriores y la evolución de los indicadores; borrar sesiones. | HU-10 | RF-14, RF-16 | S6 | No para el historial guardado en el dispositivo, que también se puede borrar; sí, con segundo factor (aal2), para lo sincronizado en la nube | `/summary/:id`, `/` |
| `/account` | Cuenta | Entrar, registrarse, recuperar la contraseña, activar el segundo factor, gestionar el consentimiento de sincronización y borrar la cuenta. | — | RF-14 | S6 | Parcial: entrada y registro sin sesión; ajustes con sesión | `/privacy`, `/history`, `/` |
| `/privacy` | Privacidad | Explicar el tratamiento de datos de salud (Ley 1581 de 2012) y recoger el consentimiento explícito. | — | RF-14 | S6 | No | `/account`, `/` |
| `/diagnostics` | Diagnóstico de la plataforma | Verificar el aislamiento de origen cruzado y las capacidades del navegador. Herramienta técnica, no forma parte del recorrido del paciente. | — | — | S0 | No | `/` |

## Paneles existentes y su ubicación

Desde el S3 la aplicación usa react-router en modo declarativo, sin cargadores de datos. Los paneles construidos están en:

| Panel (código) | Sprint en que se creó | Ubicación en el mapa |
|---|---|---|
| `SessionStage` y `SessionProgress` (`src/features/session/`) | Vista sencilla (ADR-24) | `/session`, escenario de escucha |
| `PlaybackPanel` (`src/features/audio/ui/`) | S3 | `/session`, escenario de escucha (incluye el aviso de duración) |
| `AcquisitionPanel` (`src/features/acquisition/`) | S1 | `/session`, banda de la fuente de señal |
| `SignalPanel` (`src/features/signal/`) | S2 | `/session`, detalles técnicos |
| `MusicalStatePanel` (`src/features/adaptation/`) | S4 | `/session`, detalles técnicos |
| `SessionCheckIn` (`src/features/session/`) | S6.1 | `/session`, escenario de escucha: valoración antes de empezar y enlace al resumen al detener |
| `SessionSummaryPage` (`src/features/summary/`) | S6.1 | `/summary/:id` |
| `HistoryPage` (`src/features/history/`) | S6.1 | `/history` |
| `DiagnosticsPage` (`src/features/diagnostics/`) | S0 | `/diagnostics` |

## Organización de `/session` (ADR-24)

De arriba abajo:

1. **Escenario de escucha** (superficie única):
   - `SessionStage`: el momento en palabras sencillas, el estado estimado con «Confianza no calibrada · reglas provisionales» y los avisos de calidad y de permanencia («Se conserva el escalón hasta completar su duración mínima de 3 minutos»).
   - `PlaybackPanel`: iniciar, volumen y estado de la música.
   - `SessionProgress`: el progreso de la sesión como un pentagrama que se entinta, con el tiempo en texto.
2. **Fuente de señal** (`AcquisitionPanel`): elegir y conectar la fuente, con su estado y la última lectura.
3. **Detalles técnicos**, plegados por defecto (`<details>` nativo): gráfica e índices (`SignalPanel`) y parámetros musicales programados (`MusicalStatePanel`). RF-12 se cumple al desplegarlos.

Antes de iniciar la música, el escenario ofrece la autovaloración opcional de 0 a 10 (ADR-23). Al detener, la sesión queda guardada en el dispositivo y aparece «Ver resumen de la sesión»; no se redirige sola. El botón fijo «Detener» y la tecla Esc siguen disponibles en toda la página.

## `/summary/:id` y `/history` (S6.1, solo en el dispositivo)

- **Resumen:** fecha, tiempo escuchado frente al plan, valoración al terminar si falta, indicadores al inicio y al final (promedio de hasta 15 s de buena calidad), tendencia de la variabilidad, tiempo en cada estado estimado y descarga en CSV. El texto del modelo de lenguaje aparece como «Resumen automático pendiente» hasta S6.4.
- **Historial:** sesiones de la más reciente a la más antigua, con valoraciones y cambios de frecuencia y variabilidad, evolución entre sesiones y borrado de una sesión o de todo el historial, siempre con confirmación.
- Sin cuenta: todo vive en IndexedDB. La sincronización con la nube llega en S6.2, con segundo factor. Estimador de entrega: reglas R-05, sin ONNX (limitación RF-07, ADR-14).

## Funciones todavía no activas — propuesta S5–S7

Aprobado junto con el plan de entrega. Una ruta pendiente del mapa muestra explicación accesible y regreso a Inicio/Sesión, sin rutas rotas. Acciones deshabilitadas con motivo/fecha. Google pendiente conserva correo; TOTP pendiente conserva recorrido local y bloquea sincronización/lectura remotas; Groq pendiente conserva plan manual/resumen de indicadores con «Resumen automático pendiente». Ninguna etiqueta de pendiente satisface un requisito. El segundo factor se implementa en S6.2 (ADR-10, ADR-18).
