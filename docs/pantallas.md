# Mapa de pantallas — NeuroMelody

Toda pantalla o panel nuevo se ubica en este mapa; si no encaja, se propone el cambio al mapa antes de construirlo. Este documento no define colores ni estilo visual.

**Usuarios.** El paciente es el usuario principal. El terapeuta o acompañante usa la misma cuenta y el mismo dispositivo que el paciente, sin rol ni permisos propios: su intervención se limita a las pantallas de plan e historial.

**Sesión de usuario.** Una sesión de escucha con el simulador no exige cuenta. La cuenta (Supabase Auth, con segundo factor TOTP) solo se requiere para sincronizar, ver datos de salud guardados en la nube y usar el modelo de lenguaje.

## Pantallas

| Ruta | Pantalla | Propósito | HU | RF | Sprint | ¿Requiere sesión? | Lleva a |
|---|---|---|---|---|---|---|---|
| `/` | Inicio | Punto de entrada: iniciar una sesión de escucha y acceder al plan, al historial y a la cuenta. | — | — | S3 | No | `/advertencias` (si no se aceptaron), `/plan`, `/sesion`, `/historial`, `/cuenta`, `/privacidad` |
| `/advertencias` | Advertencias de uso | Presentar el carácter no clínico de la aplicación y registrar la aceptación explícita antes de la primera sesión. | — | RF-17 | S3 | No (se guarda en el dispositivo y se sincroniza en `profiles` si hay cuenta) | `/plan`, `/sesion`, `/privacidad` |
| `/plan` | Plan de sesión | Fijar objetivos y duración (10 a 60 minutos) y ver el plan antes de empezar; ajustarlo a mano. En S6 se suma la propuesta del modelo de lenguaje. | HU-07 | RF-13, RF-18 | S3 (plan manual y por defecto), S6 (propuesta del modelo) | No para el plan manual; sí para pedir la propuesta al modelo | `/sesion`, `/` |
| `/sesion` | Sesión en curso | Conectar la fuente de señal, escuchar la música adaptada, ver la señal y los indicadores, controlar el volumen y detener. El control de detención está siempre visible. | HU-01, HU-02, HU-03, HU-04, HU-05, HU-06 | RF-01 a RF-12, RF-18 | S1 a S5 | No | `/resumen/:id` (al terminar), `/` |
| `/resumen/:id` | Resumen de sesión | Mostrar los indicadores de la sesión y el texto en lenguaje llano, marcado como generado automáticamente; permitir la descarga. | HU-08 | RF-15 | S6 | No para los indicadores locales; sí para el texto del modelo y la sincronización | `/historial`, `/` |
| `/historial` | Historial | Revisar sesiones anteriores y la evolución de los indicadores; borrar sesiones. | HU-10 | RF-14, RF-16 | S6 | No para el historial guardado en el dispositivo, que también se puede borrar; sí, con segundo factor (aal2), para lo sincronizado en la nube | `/resumen/:id`, `/` |
| `/cuenta` | Cuenta | Entrar, registrarse, recuperar la contraseña, activar el segundo factor, gestionar el consentimiento de sincronización y borrar la cuenta. | — | RF-14 | S6 | Parcial: entrada y registro sin sesión; ajustes con sesión | `/privacidad`, `/historial`, `/` |
| `/privacidad` | Privacidad | Explicar el tratamiento de datos de salud (Ley 1581 de 2012) y recoger el consentimiento explícito. | — | RF-14 | S6 | No | `/cuenta`, `/` |
| `/diagnostico` | Diagnóstico de la plataforma | Verificar el aislamiento de origen cruzado y las capacidades del navegador. Herramienta técnica, no forma parte del recorrido del paciente. | — | — | S0 | No | `/` |

## Paneles existentes y su ubicación

Hoy la aplicación no tiene enrutador: todo se muestra en una sola página. Al introducir las rutas en el S3 (react-router en modo declarativo, sin cargadores de datos), los paneles se reubican así:

| Panel (código) | Sprint en que se creó | Ubicación en el mapa |
|---|---|---|
| `PanelAdquisicion` (`src/features/adquisicion/`) | S1 | `/sesion` |
| `PanelSenal` (`src/features/senal/`) | S2 | `/sesion` |
| `DiagnosticoPage` (`src/features/diagnostico/`) | S0 | `/diagnostico` |

## Paneles previstos dentro de `/sesion`

| Panel | Propósito | RF | Sprint |
|---|---|---|---|
| Reproducción | Iniciar, volumen (con aviso de volumen moderado) y detener (botón fijo, tecla Esc y Media Session). | RF-11, RF-18 | S3 |
| Estado musical | Tempo, modo y capas actuales, y el estado estimado con su confianza en lenguaje descriptivo. | RF-09, RF-12 | S4 |
| Aviso de duración | Aviso a los 60 minutos y fundido de salida si no hay respuesta. | RF-18 | S3 |
