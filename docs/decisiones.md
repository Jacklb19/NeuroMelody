# Decisiones técnicas — NeuroMelody

Decisiones tomadas durante la construcción que completan o se desvían del documento de definición (`docs/definicion-proyecto.md`, que no se modifica). Cada una indica la parte del documento que afecta.

## ADR-07. Síntesis y secuenciador dentro del AudioWorklet, sin Tone.js

| Campo | Contenido |
|---|---|
| Contexto | El documento (Tabla 6) asigna al procesador de audio "AudioWorklet, Web Audio API, Tone.js". Tone.js programa eventos desde el hilo principal, lo que depende de temporizadores que el navegador limita en pestañas en segundo plano. |
| Decisión | La síntesis y el secuenciador viven dentro del AudioWorklet. Los parámetros musicales son `AudioParam` que cambian con rampas automatizadas en el hilo de audio. |
| Desviación | Se retira Tone.js de la Tabla 6. |
| Consecuencias | Toda la temporización musical ocurre en el hilo de audio y no depende de la visibilidad de la pestaña. A cambio, el secuenciador se escribe y prueba en el proyecto. |

## ADR-08. Groq en lugar de Gemini como modelo de lenguaje

| Campo | Contenido |
|---|---|
| Contexto | El documento (Tabla 16) guarda en Vercel la clave de Gemini. |
| Decisión | Se usa Groq con el modelo `openai/gpt-oss-20b`, con retención cero de datos activada en su configuración. La clave (`GROQ_API_KEY`) vive solo en el servidor. |
| Desviación | Cambia el proveedor de la Tabla 16. |
| Consecuencias | Se mantienen las restricciones de ADR-05: el modelo no participa en el lazo de control, solo recibe métricas agregadas y su salida se valida contra un esquema cerrado. Sin red, se usa un plan por defecto y el resumen se difiere. |

## ADR-09. Clasificador como archivo estático público

| Campo | Contenido |
|---|---|
| Contexto | El documento (Tabla 15) entrega el clasificador por `GET /v1/models/classifier` con autenticación requerida, y lo guarda en Supabase Storage. |
| Decisión | El modelo ONNX se publica como recurso estático, público y versionado, que el service worker guarda para funcionar sin conexión. No requiere sesión. La tabla `model_versions` queda solo para metadatos (versión, huella SHA-256, métricas y fecha). |
| Desviación | Se retira el punto de acceso autenticado de la Tabla 15. |
| Consecuencias | Una sesión con el simulador funciona completa sin cuenta y sin red. El modelo no contiene datos de usuarios, así que publicarlo no expone información personal. |

## ADR-10. Segundo factor obligatorio para los datos en la nube

| Campo | Contenido |
|---|---|
| Contexto | Las sesiones sincronizadas contienen indicadores fisiológicos: son datos de salud. |
| Decisión | Sincronizar y leer datos de salud de la nube exige autenticación con segundo factor TOTP (nivel `aal2`), tanto en las políticas de seguridad a nivel de fila de `sessions` y `session_metrics` como en la API. Las sesiones con el simulador y el historial guardado en el dispositivo no exigen cuenta. |
| Desviación | Amplía la Tabla 18 (acceso a sesiones de otro usuario) con un segundo factor. |
| Consecuencias | Quien obtenga la contraseña no accede a los datos de salud sin el segundo factor. Se admiten dos dispositivos de segundo factor por cuenta. |

## ADR-11. El código se escribe en inglés

| Campo | Contenido |
|---|---|
| Contexto | Hasta el S3 el código mezclaba nombres en español. La interfaz se ofrecerá también en inglés, y el código se comparte con herramientas y bibliotecas que usan el inglés. |
| Decisión | Todo el código va en inglés: clases, componentes, funciones, variables, tipos, constantes, archivos, carpetas, rutas de la URL, variables CSS, nombres de pruebas y comentarios. Los mensajes de commit también, desde el 29 sep 2026. Solo quedan en español los textos que ve el usuario (en los diccionarios de traducción) y los documentos de `docs/`. |
| Desviación | Ninguna respecto del documento de definición, que no fija el idioma del código. |
| Consecuencias | El código existente se renombra con el renombrado de TypeScript, en commits aparte por área y sin cambiar el comportamiento. Las rutas de la URL cambian (por ejemplo, `/sesion` pasa a `/session`), y `docs/pantallas.md` se actualiza en consecuencia. |
