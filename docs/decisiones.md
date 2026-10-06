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

## ADR-12. Reglas provisionales y prioridades de adaptación S4

| Campo | Contenido |
|---|---|
| Estado | Aprobado por el usuario el 5 de octubre de 2026, incluida interpretación de RNF-02. |
| Contexto | R-05 prevé reglas deterministas; la guía anterior tenía ambigüedades en Incierta y el retroceso. No hay entrenamiento ni artefacto ONNX; véase ADR-14. |
| Decisión | Comparar FC ±10 % y RMSSD ∓20 % con la base de al menos 12 publicaciones válidas y de buena calidad durante la calibración de 3 minutos de señal; continuar si faltan. Histéresis de 3 estados consecutivos y confianza no calibrada. Incierta permite avanzar sin Alta reciente tras 3 minutos de audio y con calidad buena. Alta aceptada retrocede un escalón inmediatamente, interrumpe las rampas desde su valor actual y reinicia la permanencia. No hay cola de cambios obsoletos. |
| Desviación | Completa los umbrales de R-05 y reemplaza las prioridades de diseno-musical.md. RNF-02: Alta desde aceptación tras histéresis, sin permanencia. Avance Baja/Incierta desde elegibilidad: máximo entre comienzo de última transición +180 s y cumplimiento de calidad buena/estado aceptado/tres estimaciones sin Alta. Se conservan ambas mediciones; el avance puede esperar más de 2 s desde aceptación. Interpretación explícita del usuario, sin modificar la especificación. |
| Consecuencias | Pruebas/JSON registran ambas latencias. La interfaz anuncia que conserva el escalón hasta completar su duración. Las notificaciones de fuente revisan el reloj de audio entre estimaciones sin contarse como estimaciones; AudioParam automatiza el sonido. S4 cierra con pruebas automáticas y una escucha del usuario; grupo de oyentes y ajuste de levels.ts posteriores, propuesto 16 oct, commit pequeño separado. |

## ADR-13. Calendario de entrega hasta el 17 de noviembre

| Campo | Contenido |
|---|---|
| Estado | Aprobado y revisado por instrucciones del usuario el 5 de octubre de 2026. |
| Contexto | El cronograma de la especificación termina el 19 de noviembre, después de la entrega obligatoria del 17. |
| Decisión | Desarrollo hasta el 12 nov; publicación/revisión 13–17 nov. Lunes a viernes excluyendo festivos Colombia 12 oct, 2 nov y 16 nov. S4: 5 oct aprovechando lo ya desarrollado y pendiente de una escucha del usuario; S5: 6–14 oct, prueba BLE 13 oct; reserva recuperada de ONNX: 15–16 oct; S6: 19 oct–5 nov; S7: 6–12 nov. Fines de semana solo como reserva adicional opcional. |
| Desviación | Sustituye únicamente el calendario de ejecución. No modifica `definicion-proyecto.md`, no elimina RF ni HU y no autoriza operaciones remotas. |
| Consecuencias | Capacidad: 27 días efectivos; esfuerzo 25 y reserva 2 (15–16 oct). La revisión con ONNX agotaba reserva; se recupera por ADR-14. Del 13–17 nov solo 13 y 17 son laborables. S6.2 estima 7 días: correo, todo TOTP/recuperación/dos dispositivos, JWT/RLS/aal2 y sincronización; NeuroMelody implementa el patrón de login y lo documenta en docs/autenticacion.md en S6.2. S6.3: Google y cierre. Ruta crítica/recursos en plan-entrega.md; no se abre la nube sin aal2. |

## ADR-14. Entrega con reglas R-05; entrenamiento no iniciado

| Campo | Contenido |
|---|---|
| Estado | Decisión explícita del usuario el 5 oct 2026, tras comprobación de solo lectura. |
| Contexto | La mención del 29 sep de entrenamiento era una intención, no trabajo ejecutado. Branches, reflog disponible, log de scripts/clasificador y búsqueda de carpeta/ONNX no muestran entrenamiento. No hay dataset etiquetado, etiquetas ni modelo entrenado. RR nsr2db son datos de prueba de señal, sin etiquetas de activación. |
| Decisión | Clasificador de entrega: reglas S4, alternativa R-05. Retirar S5.3 ONNX y dedicar dos jornadas a reserva. Sin dependencia de otra rama/agente. ONNX solo mejora opcional al final si sobra tiempo y el usuario define contrato de etiquetas y aprueba iniciar. No integrar hallazgos posteriores sin aprobación. |
| Desviación | RF-07 queda limitado: no se entrega el clasificador entrenado/ONNX de la especificación. No se modifica definicion-proyecto.md ni se afirma cumplimiento literal de RF-07. ADR-09 permanece como diseño de publicación si se realiza la mejora opcional. |
| Consecuencias | Confianza no calibrada visible; lazo verificable sin entrenamiento. Comparación relativa por persona, exactitud al menos igual a reglas y sin empeorar recall por clase queda como propuesta opcional; no bloquea entrega ni permite inventar etiquetas o fuentes. |
