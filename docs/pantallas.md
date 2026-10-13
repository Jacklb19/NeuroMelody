# Mapa de pantallas — NeuroMelody

Toda pantalla o panel nuevo se ubica en este mapa; si no encaja, se propone el cambio al mapa antes de construirlo. Este documento no define colores ni estilo visual. La presentación de las cinco pantallas existentes se documenta en [diseno-visual.md](diseno-visual.md); el rediseño conserva sus rutas, paneles y comportamiento.

**Usuarios.** El paciente es el usuario principal. El terapeuta o acompañante usa la misma cuenta y el mismo dispositivo que el paciente, sin rol ni permisos propios: su intervención se limita a las pantallas de plan e historial.

**Sesión de usuario.** Una sesión de escucha con el simulador no exige cuenta. La cuenta (Supabase Auth, con segundo factor TOTP) solo se requiere para sincronizar, ver datos de salud guardados en la nube y usar el modelo de lenguaje.

## Pantallas

| Ruta | Pantalla | Propósito | HU | RF | Sprint | ¿Requiere sesión? | Lleva a |
|---|---|---|---|---|---|---|---|
| `/` | Portada | Página pública (ADR-28): qué es NeuroMelody, cómo funciona su lazo, fuentes de señal, privacidad y tecnología, con escena 3D animada y acceso a la app. Diseño propio, fuera del `Layout` de la app. | — | — | Portada | No | `/app`, `/plan`, `/account`, `/privacy`, `/diagnostics` |
| `/app` | Inicio de la app | Punto de entrada de la app: iniciar una sesión de escucha y acceder al plan, al historial, al progreso y a la cuenta. | — | — | S3 (antes en `/`) | No | `/warnings` (si no se aceptaron), `/plan`, `/session`, `/history`, `/progress`, `/account`, `/privacy` |
| `/warnings` | Advertencias de uso | Presentar el carácter no clínico de la aplicación y registrar la aceptación explícita antes de la primera sesión. | — | RF-17 | S3 | No (se guarda en el dispositivo y se sincroniza en `profiles` si hay cuenta) | `/plan`, `/session`, `/privacy` |
| `/plan` | Plan de sesión | Fijar objetivos y duración (10 a 60 minutos) y ver el plan antes de empezar; ajustarlo a mano. Con cuenta, el modelo de lenguaje puede proponer la duración (bloque 15). | HU-07 | RF-13, RF-18 | S3 (plan manual y por defecto), S6 (propuesta del modelo) | No para el plan manual; sí para pedir la propuesta al modelo | `/session`, `/` |
| `/session` | Sesión en curso | Conectar la fuente de señal, escuchar la música adaptada, ver la señal y los indicadores, controlar el volumen y detener. El control de detención está siempre visible. | HU-01, HU-02, HU-03, HU-04, HU-05, HU-06 | RF-01 a RF-12, RF-18 | S1 a S5 | No | `/summary/:id` (al terminar), `/` |
| `/summary/:id` | Resumen de sesión | Mostrar los indicadores de la sesión y el texto en lenguaje llano, marcado como generado automáticamente; permitir la descarga. | HU-08 | RF-15 | S6 | No para los indicadores locales; sí para el texto del modelo y la sincronización | `/history`, `/` |
| `/history` | Historial | Revisar sesiones anteriores y borrarlas; lleva a la evolución entre sesiones. | HU-10 | RF-14, RF-16 | S6 | No para el historial guardado en el dispositivo, que también se puede borrar; sí, con segundo factor (aal2), para lo sincronizado en la nube | `/summary/:id`, `/progress`, `/` |
| `/progress` | Tu progreso | Ver cómo cambian entre sesiones el pulso, la variación entre latidos y la autovaloración, al empezar y al terminar (ADR-33). Describe; no interpreta. | HU-10 | RF-16 | Bloque 11 | No: usa las sesiones guardadas en el dispositivo | `/plan`, `/report`, `/history` (por la cabecera) |
| `/report` | Informe de tus sesiones | Preparar una hoja con el resumen de un grupo de sesiones para imprimirla o guardarla como PDF y llevarla a quien acompaña a la persona (ADR-33). Describe; no interpreta. | HU-10 | RF-16 | Bloque 13 | No: usa las sesiones guardadas en el dispositivo y no envía nada | `/plan`, `/progress` (por el navegador) |
| `/account` | Perfil | Resumen y ajustes de la persona (ADR-30): actividad en el dispositivo, seguridad (contraseña y verificación en dos pasos), privacidad, cerrar sesión. Sin cuenta, invita a crear una. Se abre desde el avatar de la cabecera. | — | RF-14 | S6 | No (sin cuenta muestra la actividad local) | `/login`, `/register`, `/privacy`, `/history` |
| `/login`, `/register`, `/forgot-password`, `/reset-password` | Acceso | Pantallas propias, fuera del `Layout` de la app: iniciar sesión (correo o Google, con el código de dos pasos si aplica), crear cuenta (correo y contraseña dos veces, sin correo de confirmación), pedir el enlace de recuperación y elegir la contraseña nueva. Todas ofrecen «Continuar sin cuenta» o volver. | — | RF-14 | S6 | No | `/app`, entre sí, `/privacy` |
| `/privacy` | Privacidad | Explicar el tratamiento de datos de salud (Ley 1581 de 2012) y recoger el consentimiento explícito. | — | RF-14 | S6 | No | `/account`, `/` |
| `/collect` | Ayuda a mejorar la app | Grabación guiada (ADR-33): reposo, respiración lenta y tarea de concentración, cada tramo guardado con su etiqueta, con consentimiento explícito, en el dispositivo; exportar y borrar. El modelo no se entrena aquí. | — | RF-07 | Bloque 14 | No (pide las advertencias aceptadas, como la sesión) | `/app`, `/warnings` |
| `/diagnostics` | Diagnóstico de la plataforma | Verificar el aislamiento de origen cruzado y las capacidades del navegador. Herramienta técnica, no forma parte del recorrido del paciente. | — | — | S0 | No | `/` |

## Paneles existentes y su ubicación

Desde el S3 la aplicación usa react-router en modo declarativo, sin cargadores de datos. Los paneles construidos están en:

| Panel (código) | Sprint en que se creó | Ubicación en el mapa |
|---|---|---|
| `SessionStage` y `SessionProgress` (`src/features/session/`) | Vista sencilla (ADR-24) | `/session`, escenario de escucha |
| `PlaybackPanel` (`src/features/audio/ui/`) | S3 | `/session`, escenario de escucha (incluye el aviso de duración) |
| `AcquisitionPanel` (`src/features/acquisition/`) | S1 | `/session`, banda de la fuente de señal (incluye la fuente experimental por cámara, P-01) |
| `SignalPanel` (`src/features/signal/`) | S2 | `/session`, detalles técnicos |
| `MusicalStatePanel` (`src/features/adaptation/`) | S4 | `/session`, detalles técnicos |
| `SessionCheckIn` (`src/features/session/`) | S6.1 | `/session`, escenario de escucha: valoración antes de empezar y enlace al resumen al detener |
| `BreathingGuide` (`src/features/session/breathing/`) | Bloque 10 (ADR-33) | `/session`, escenario de escucha, bajo el orbe: botón para activar la respiración guiada y la palabra que la acompaña |
| `SessionSummaryPage` (`src/features/summary/`) | S6.1 | `/summary/:id` |
| `HistoryPage` (`src/features/history/`) | S6.1 | `/history` |
| `ProgressPage` y `BeforeAfterChart` (`src/features/progress/`) | Bloque 11 (ADR-33) | `/progress` |
| `CollectionPage` (`src/features/collection/`) | Bloque 14 (ADR-33) | `/collect`; reutiliza `AcquisitionPanel`, el orbe y la respiración guiada |
| `ReportPage` (`src/features/report/`) | Bloque 13 (ADR-33) | `/report`; reutiliza el selector de sesiones (`RangePicker`) y la gráfica de `/progress` |
| `DiagnosticsPage` (`src/features/diagnostics/`) | S0 | `/diagnostics` |
| `CameraPulsePanel` (`src/features/diagnostics/`) | Prototipo P-01 | `/diagnostics`: pulso con la cámara del celular, sin guardar imágenes |

## Organización de `/session` (ADR-24)

De arriba abajo:

1. **Escenario de escucha** (superficie única):
   - `SessionStage`: el momento en palabras sencillas, el estado estimado con «Confianza no calibrada · reglas provisionales» y los avisos de calidad y de permanencia («Se conserva el escalón hasta completar su duración mínima de 3 minutos»).
   - `PlaybackPanel`: iniciar, volumen y estado de la música.
   - `SessionProgress`: el progreso de la sesión como un pentagrama que se entinta, con el tiempo en texto.
2. **Fuente de señal** (`AcquisitionPanel`): elegir y conectar cómo se mide el pulso (banda Bluetooth o cámara del celular, esta última marcada como experimental, P-01), con su estado y la última lectura. Debajo, «No tengo cómo medir mi pulso: probar la app» pasa al **modo de prueba** (ver más abajo).
3. **Detalles técnicos**, plegados por defecto (`<details>` nativo): gráfica e índices (`SignalPanel`) y parámetros musicales programados (`MusicalStatePanel`). RF-12 se cumple al desplegarlos.

Antes de iniciar la música, el escenario ofrece la autovaloración opcional de 0 a 10 (ADR-23). Al detener, la sesión queda guardada en el dispositivo y aparece «Ver resumen de la sesión»; no se redirige sola. El botón fijo «Detener» y la tecla Esc siguen disponibles en toda la página.

### Cambios de ADR-42 (13 oct 2026)

- **Navegación de la app:** Inicio, Nueva sesión (`/plan`) e Historial. `/session` no está en la navegación: se llega preparando la sesión, o con «Repetir la última» desde el inicio.
- **Inicio (`/app`):** la tarjeta principal lleva a preparar la sesión («Preparar mi sesión») y, si ya hay sesiones, ofrece «Repetir la última». Debajo, las cinco intenciones con una línea que dice qué hace la música con cada una.
- **`/session`, de arriba abajo:** (1) antes de la primera nota, los tres pasos «Antes de empezar» con su estado; (2) «Cómo se mide tu pulso», plegable, con el panel de la fuente dentro: abierto al llegar, se pliega solo cuando la música suena con el pulso conectado; (3) el escenario de escucha, que mientras suena añade el recorrido de la música, su ritmo y «¿Qué significa?» junto al estado estimado, y al terminar «Lo que hizo la música»; (4) los detalles técnicos, plegados.

## Modo de prueba (simulador y registros de ejemplo)

El simulador y los registros de ejemplo no miden a la persona: existen para conocer la app sin sensor (y para la demostración). Por eso están aparte de las fuentes reales.

- **Entrar y salir:** un enlace bajo el selector de fuente, «No tengo cómo medir mi pulso: probar la app» y «Volver a medir mi pulso». No se puede cambiar con una fuente conectada. Al abrir, el panel ofrece solo banda y cámara, y elige la primera que el navegador pueda usar.
- **Mientras está activo:** el selector ofrece simulador y registro de ejemplo (con escenario y velocidad), y una nota dice «Modo de prueba: este pulso no es el tuyo… lo que escuches así no se guarda».
- **Al terminar una sesión de prueba:** no se guarda. En lugar de «Sesión guardada» aparece «Era una sesión de prueba y no se guardó», con la invitación a medir el pulso. No va al historial, al progreso, al informe ni a la nube.
- **En `/collect`:** el protocolo se puede recorrer en modo de prueba, lo avisa antes de empezar y al final dice «Prueba terminada»: no guarda ni exporta nada.
- **Sesiones de prueba anteriores a esta regla:** siguen en el historial, donde se pueden borrar, pero no cuentan en «Tu progreso» ni en el informe.

## Respiración guiada en `/session` (ADR-33)

Vive en el escenario de escucha, bajo el orbe. No añade ruta ni pantalla.

- **Activarla:** un botón en píldora «Respirar con la música», que la persona enciende y apaga cuando quiere. Empieza encendida solo si en el plan eligió «Acompañar una respiración lenta»; en cualquier otro caso empieza apagada.
- **Qué hace:** el orbe crece al inhalar y se recoge al exhalar, y debajo se lee «Inhala» o «Exhala». El orbe sigue latiendo con el pulso mientras guía la respiración.
- **Ritmo:** se cuenta en tiempos de la música (inhalar 4, exhalar 6), así que la respiración se hace más lenta cuando la música baja el paso. Sin música sonando usa el tempo con el que empieza toda sesión. Sigue el tempo de la música, no el golpe exacto de cada compás: el motor de audio no se toca.
- **Reducir movimiento:** el orbe queda quieto y la palabra sola marca el cambio.
- **Lectores de pantalla:** la palabra se anuncia al cambiar, porque es la función que la persona activó.
- **Límites:** no cambia la música ni el estado estimado, no se guarda con la sesión y no promete ningún efecto.

## Objetivos del plan (HU-07, ADR-27)

En `/plan`, antes de la duración, un grupo de casillas opcionales con los objetivos del catálogo (`goalCatalog.ts`): Relajarme, Descansar antes de dormir, Recuperar la calma después de una actividad, Acompañar una respiración lenta y Tomar una pausa para mí. Viajan a `/session` en el parámetro `goals`, se guardan con la sesión y aparecen en el resumen y en el historial («Sin objetivos elegidos» si no hay).

Desde ADR-38 se elige **uno solo** (marcar otro reemplaza al anterior; desmarcarlo deja la sesión sin objetivo) y ese objetivo decide el programa de la sesión: en qué nivel empieza la música, hasta dónde baja y si la respiración guiada empieza encendida. La tarjeta «Tu sesión» lo cuenta con una frase bajo el objetivo y nombra el nivel de los primeros minutos.

## Sesión para dormir (ADR-41)

Con el objetivo «Descansar antes de dormir», `/session` cambia en dos cosas. Tras 20 segundos sin tocar la pantalla, una capa oscura la cubre con el texto «Pantalla atenuada para dormir. Toca para verla.»; cualquier toque o tecla la quita, y «Detener» sigue visible encima. Al acabar el plan no hay aviso: la música se apaga sola y la sesión queda terminada.

## Ambiente de la sesión (ADR-40)

En `/plan`, después de la duración: «¿Con qué ambiente?», cuatro tarjetas con icono (Solo música, Lluvia, Mar, Viento). Empieza en el último elegido en el dispositivo. La tarjeta «Tu sesión» lo nombra («Con lluvia de fondo») y la elección viaja a `/session` en el parámetro `ambience`. No añade pantalla ni se guarda con la sesión.

## `/summary/:id` y `/history` (S6.1, solo en el dispositivo)

- **Resumen:** fecha, tiempo escuchado frente al plan, objetivos elegidos, valoración al terminar si falta, indicadores al inicio y al final (promedio de hasta 15 s de buena calidad), tendencia de la variabilidad, tiempo en cada estado estimado y descarga en CSV. Al final, «Tu sesión en pocas palabras»: el texto del modelo de lenguaje (ver «Modelo de lenguaje»).
- **Historial:** sesiones de la más reciente a la más antigua, con valoraciones y cambios de frecuencia y variabilidad, una tarjeta que lleva a «Tu progreso» y borrado de una sesión o de todo el historial, siempre con confirmación.
- Sin cuenta, todo vive en IndexedDB. Con cuenta, verificación en dos pasos y consentimiento, las sesiones se sincronizan con la nube (ver «Sincronización»). El estado lo estima el clasificador entrenado, con las reglas como respaldo (ADR-32).

## `/progress`, «Tu progreso» (ADR-33, solo en el dispositivo)

Se llega desde «Tu actividad» en el inicio y desde la tarjeta del historial; no está en la cabecera. De arriba abajo:

1. **Qué sesiones se muestran:** tres botones en píldora, «Últimas 7», «Últimas 30» (por defecto) y «Todas». Todo lo que hay debajo responde a esa elección.
2. **Totales:** sesiones, minutos escuchados y desde qué fecha.
3. **Una tarjeta por tema** («Tu pulso», «Variación entre latidos», «Cómo te sentías»): título, una línea que explica qué es, una frase que cuenta en cuántas sesiones el valor terminó más bajo o más alto que al empezar, y una gráfica con dos líneas, «Al empezar» y «Al terminar», de la sesión más antigua a la más reciente. Una sesión sin datos deja un hueco en la línea. Al señalar una sesión, o al recorrerlas con las flechas del teclado, se leen sus dos valores.
4. **Los mismos datos en una tabla**, plegada por defecto.
5. **Aviso** de que son indicadores descriptivos.

Sin sesiones invita a preparar una. Con una sola muestra sus valores y avisa de que la evolución aparece a partir de la segunda. Cuando haya sincronización (bloque 12), las sesiones de la nube entran por la misma lista.

## `/report`, informe para compartir (ADR-33, solo en el dispositivo)

Se llega desde la tarjeta «Compártelo con quien te acompaña», al final de «Tu progreso»; abre con el mismo grupo de sesiones que estaba elegido allí (viaja en la dirección, parámetro `range`). No está en la cabecera.

1. **En pantalla, fuera de la hoja:** qué es y para quién, el selector de sesiones («Últimas 7», «Últimas 30», «Todas») y el botón «Imprimir o guardar como PDF», que abre la impresión del navegador. Nada de esto se imprime.
2. **La hoja** (lo único que se imprime), siempre sobre papel claro, con el tema que tenga la app:
   - marca, fecha en que se preparó, título y periodo que cubre (de la sesión más antigua a la más reciente);
   - sesiones, minutos escuchados y los objetivos elegidos con cuántas veces;
   - por cada tema (pulso, variación entre latidos, cómo se sentía): qué es, promedio al empezar y al terminar, en cuántas sesiones cambió y la gráfica de «al empezar» y «al terminar»;
   - tabla sesión por sesión: fecha, tiempo escuchado, con qué se midió y los tres valores;
   - «Para leer esta hoja»: qué es la app, que son indicadores descriptivos y no una valoración clínica y cómo se toman los dos valores.
3. La hoja habla de «la persona», no de «tú», porque la lee alguien más.

Las sesiones hechas con el simulador o con un registro de ejemplo sirven para probar la app y no entran en el informe: ni en la hoja ni en sus cifras. Si se dejó alguna fuera, la pantalla lo dice (la hoja no). El selector cuenta solo las sesiones que entran.

Sin sesiones, o si todas son de prueba, invita a preparar una y no muestra hoja ni botón.

## `/collect`, grabación guiada para el modelo (ADR-33, solo en el dispositivo)

Se llega desde el perfil («Ayuda a mejorar la app», en Preferencias). Es opcional y no cambia nada de las sesiones. Pide las advertencias de uso aceptadas, como `/session`.

1. **Antes de empezar:** qué se va a hacer (tres tramos con su duración), qué se guarda, la casilla de consentimiento y, debajo, la fuente de señal (el mismo panel de `/session`). «Empezar la grabación» solo se activa con la casilla marcada y la fuente conectada. En modo de prueba avisa de que esos latidos no son de la persona y de que al final no se guarda nada.
2. **Cada tramo** (reposo 5 min, respiración lenta 3 min, tarea de concentración 3 min): primero las instrucciones y «Empezar este tramo»; después la actividad (el orbe en reposo, el orbe con «Inhala/Exhala», o restar de 7 en 7 desde 1000 escribiendo cada resultado), el pentagrama de progreso y el tiempo que queda. El tiempo es tiempo de señal: si la señal se corta y vuelve a empezar, el tramo se repite. «Dejarlo por ahora» descarta todo.
3. **Al terminar:** la grabación se guarda en el dispositivo (base propia, aparte del historial) y se puede exportar.
4. **Tus grabaciones:** lista con fecha, fuente y número de latidos; «Exportar N grabaciones» descarga un archivo JSON y cada una se borra con confirmación.
5. **Enviar para entrenar el modelo:** en cada grabación, «Enviar para entrenar el modelo» abre la explicación de qué viaja (los latidos, los nombres de los tramos y el código al azar; nunca el nombre ni el correo) y el botón «Acepto y la envío», que es el consentimiento. Una grabación enviada lo dice con una etiqueta. Borrarla la retira primero de la nube; si la nube no lo confirma, no se borra y se explica. Enviar exige cuenta con verificación en dos pasos, porque son latidos; si falta, lo dice y enlaza a dónde se resuelve. Exportar y borrar funcionan siempre.

Qué se guarda: los intervalos entre latidos de cada tramo con su etiqueta, la fuente, la fecha, el instante del consentimiento y un código al azar del dispositivo (agrupa las grabaciones de una persona sin decir quién es). Nada se envía solo: la persona decide, una por una, si exporta o envía. El reentrenamiento se hace fuera de la app (ver `back/training/README.md`) y cada versión nueva la aprueba una persona; el modelo nunca se reentrena solo.

**Versión del modelo:** al abrir `/session` con cuenta, la app pide la última versión publicada del clasificador. Si no hay ninguna, no hay red o el archivo no valida, usa la última que descargó o la que trae la app. No hay pantalla nueva: el escenario sigue diciendo que el estado lo estima un modelo entrenado.

## Modelo de lenguaje en `/plan` y `/summary/:id` (RF-13, RF-15, ADR-08)

No añade pantallas. El modelo nunca participa en la música: solo propone y redacta, y todo lo que escribe se muestra con la marca «Texto generado automáticamente».

- **`/plan`, bajo las duraciones:** el botón «Proponme una duración» y, a su lado, qué se envía (solo los objetivos marcados y la hora). Sin objetivos marcados está desactivado y lo dice. La respuesta aparece debajo: «Propuesta: N minutos», una frase y «Usar esta duración»; la duración no cambia hasta que la persona lo pulsa. Sin cuenta, una línea invita a entrar; en un despliegue sin API no aparece nada. Si el modelo no responde, lo dice y el plan manual sigue igual.
- **`/summary/:id`, última sección, «Tu sesión en pocas palabras»:** explica qué recibe el modelo (minutos, pulso y variación al empezar y al terminar, tiempo en cada estado y las dos valoraciones; nunca el nombre, la fecha ni los latidos) y ofrece «Acepto y quiero el resumen»: pedirlo es el consentimiento. El texto queda guardado en el dispositivo, así que se pide una sola vez («Pedir otro» lo rehace). Solo necesita una cuenta: las cifras las envía el navegador, que ya las muestra en esta pantalla, así que la sesión puede seguir solo en el dispositivo y no hacen falta los dos pasos ni la sincronización. Sin cuenta invita a entrar.

## Rediseño de la app (ADR-30)

- **Portada (`/`):** sin sección de tecnología ni enlace al código; lenguaje para todo público. Secciones: cabecera con la escena 3D y el trazo del pulso en vivo, qué es, cómo funciona, para qué sirve (los objetivos del plan), cómo medir el pulso, privacidad y cierre. Los botones llevan a `/register` e `/login`.
- **Inicio (`/app`):** saludo según la hora, tarjeta «Tu próxima sesión» (empezar o personalizar), atajos por objetivo hacia `/plan?goals=…`, y la actividad del dispositivo o, si no hay sesiones, los tres pasos de la primera.
- **Plan (`/plan`):** objetivos y duración como tarjetas seleccionables y una tarjeta fija «Tu sesión» con el botón de empezar.
- **Sesión (`/session`):** el escenario gira alrededor del orbe (`SessionOrb`), que toma el tono del estado estimado, late con cada latido y está rodeado por un anillo de progreso; al lado, la frase, el estado y los controles. Debajo, la fuente de señal y los detalles técnicos como tarjetas. Se conservan el pentagrama de progreso, «Detener» fijo y Esc.
- **Cabecera de la app:** Inicio, Plan, Sesión, Historial, los botones de tema e idioma (ADR-31) y el avatar que abre el perfil. El perfil tiene además la sección «Apariencia e idioma».

## `/account` y `/privacy` (S6.2, ADR-29; las pantallas de acceso se rehicieron en ADR-30)

- **Cuenta sin sesión:** pestañas «Entrar», «Crear cuenta» (confirmación por correo) y «Recuperar contraseña» (enlace que abre `/account?mode=recovery` con el formulario de contraseña nueva).
- **Con sesión y un dispositivo verificado:** antes de mostrar nada se pide el código TOTP (aal1 → aal2). Lo mismo ocurre al entrar en `/app`, que es adonde vuelve el inicio con Google: lleva a la pantalla del código. Mientras se lee la sesión guardada en el navegador no se dibuja nada de la app, ni la cabecera, para que no se vea un instante antes del código; quien no tiene sesión guardada no espera, y la espera nunca pasa de unos segundos. Quien no lo tenga a mano puede elegir «No tengo el código: cerrar sesión» y seguir sin cuenta.
- **Cerrar sesión** siempre cierra la sesión en el dispositivo, aunque el servidor no pueda confirmarlo (por ejemplo, porque activar los dos pasos cerró las sesiones de los otros dispositivos).
- **Con sesión:** correo, estado del segundo factor, dispositivos de autenticación (añadir con QR o clave, quitar con confirmación; se recomienda un segundo dispositivo como recuperación), salir y enlace a privacidad. «Borrar la cuenta» pide confirmación, borra la cuenta y todo lo que guarda en la nube, y cierra la sesión; las sesiones del dispositivo no se tocan.
- **Privacidad:** qué se guarda y dónde, cámara, nube, resumen automático y derechos (Ley 1581); casilla de consentimiento de sincronización. Sin cuenta, la respuesta se queda en el dispositivo; con cuenta, se guarda en `profiles` y es la única que vale.

## Sincronización de sesiones (RF-14, ADR-34)

No añade pantallas. Funciona sola cuando se cumplen tres cosas: hay cuenta, la sesión pasó la verificación en dos pasos y la persona dio su consentimiento en `/privacy`.

- **Historial:** bajo el título, una línea dice dónde están las sesiones: solo en el dispositivo (con el enlace a lo que falta: entrar, activar los dos pasos o dar el consentimiento), sincronizando, o en el dispositivo y en la cuenta. Si falla, lo dice con el motivo y ofrece «Reintentar».
- **Qué hace:** sube las sesiones del dispositivo que la nube no tiene, baja las que solo tiene la nube y las guarda en el dispositivo, e iguala la valoración final. Historial, resumen y «Tu progreso» siguen leyendo del dispositivo.
- **Guardar:** al terminar una sesión se guarda primero en el dispositivo y se envía después; si el envío falla, no se pierde nada y se reintenta en la siguiente sincronización.
- **Borrar:** una sesión se borra del dispositivo al instante, con o sin conexión. Si ya estaba en la cuenta, su borrado queda anotado en una cola (por cuenta, en el dispositivo) hasta que la nube lo confirme; la siguiente sincronización entrega la cola antes de leer la nube, así que una sesión borrada sin conexión no vuelve a aparecer. Mientras quede algún borrado en camino, la línea del historial lo dice. Una sesión borrada desde otro dispositivo desaparece de este en la siguiente sincronización.
- **Sin conexión (HU-09, bloque 16):** la sesión completa funciona sin red. Lo que se guardó, valoró o borró sin conexión sale solo cuando la conexión vuelve (el navegador avisa y la app sincroniza), y también al abrir el historial o con «Reintentar». Reenviar no duplica nada: cada sesión viaja con el id que le dio el dispositivo.

## Funciones todavía no activas

Aprobado junto con el plan de entrega. Una ruta pendiente del mapa muestra explicación accesible y regreso a Inicio/Sesión, sin rutas rotas. Acciones deshabilitadas con motivo/fecha. Google pendiente conserva correo; TOTP pendiente conserva recorrido local y bloquea sincronización/lectura remotas; Sin el modelo de lenguaje (sin cuenta, sin API o si no responde) se conservan el plan manual y el resumen de indicadores, y la pantalla dice qué falta. Ninguna etiqueta de pendiente satisface un requisito. El segundo factor se implementa en S6.2 (ADR-10, ADR-18).
