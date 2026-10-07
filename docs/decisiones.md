# Decisiones técnicas — NeuroMelody

Decisiones aprobadas durante la construcción que completan o se desvían del documento de definición (`docs/definicion-proyecto.md`, que no se modifica). Los ADR-01 a ADR-06 están en ese documento. Aquí solo entran decisiones ya aprobadas.

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
| Decisión | Groq con el modelo `openai/gpt-oss-20b`, con retención cero activada en Data Controls (por defecto puede guardar registros hasta 30 días). La clave (`GROQ_API_KEY`) vive solo en el servidor. Caché, reintento que respeta la espera indicada y límite de tokens de salida. |
| Desviación | Cambia el proveedor de la Tabla 16. |
| Consecuencias | Se mantienen las restricciones de ADR-05: el modelo no participa en el lazo de control, solo recibe métricas agregadas con aviso y consentimiento, y su salida se valida contra un esquema cerrado (Pydantic). Sin red: plan por defecto (estado medio, 20 minutos) y resumen diferido. |

## ADR-09. Clasificador como archivo estático público

| Campo | Contenido |
|---|---|
| Contexto | El documento (Tabla 15) entrega el clasificador por `GET /v1/models/classifier` con autenticación requerida. |
| Decisión | Si se llega a entrenar un modelo ONNX (ver ADR-14), se publica como recurso estático, público y versionado, guardado por el service worker. `model_versions` queda solo para metadatos. |
| Desviación | Se retira el punto de acceso autenticado de la Tabla 15. |
| Consecuencias | Una sesión con el simulador funciona completa sin cuenta y sin red. Hoy no hay modelo: el estimador es por reglas (ADR-12). |

## ADR-10. Segundo factor obligatorio para los datos en la nube

| Campo | Contenido |
|---|---|
| Contexto | Las sesiones sincronizadas contienen indicadores fisiológicos: son datos de salud. |
| Decisión | Sincronizar y leer datos de salud de la nube exige segundo factor TOTP (nivel `aal2`), tanto en las políticas RLS de `sessions` y `session_metrics` como en la API. Se admiten dos dispositivos de segundo factor. Las sesiones con el simulador y el historial guardado en el dispositivo no exigen cuenta. |
| Desviación | Amplía la Tabla 18 con un segundo factor. |
| Consecuencias | Quien obtenga la contraseña no accede a los datos de salud. Requiere una migración nueva en S6, porque las políticas actuales no exigen `aal2`. |

## ADR-11. El código se escribe en inglés

| Campo | Contenido |
|---|---|
| Contexto | Hasta el S3 el código mezclaba nombres en español. |
| Decisión | Todo el código va en inglés: identificadores, archivos, carpetas, rutas de la URL, variables CSS, nombres de pruebas y comentarios. Los mensajes de commit también. Solo quedan en español los textos que ve el usuario y los documentos de `docs/`. |
| Desviación | Ninguna: el documento no fija el idioma del código. |
| Consecuencias | Los renombrados se hacen con el renombrado de TypeScript, en commits aparte y sin cambiar el comportamiento. Quedan comentarios y nombres de pruebas en español por migrar. |

## ADR-12. Estimador por reglas y prioridades de adaptación

| Campo | Contenido |
|---|---|
| Estado | Aprobado el 5 oct 2026, incluida la interpretación de RNF-02. Valores provisionales, sin validación fisiológica. |
| Decisión | Base: promedio de FC media y RMSSD de al menos 12 publicaciones válidas y de buena calidad, buscada en los primeros 3 minutos de señal; si faltan, la calibración continúa en el nivel intermedio. Alta: FC sube ≥10 % y RMSSD baja ≥20 % respecto a la base; Baja: lo contrario; el resto es Incierta. Histéresis de 3 estimaciones consecutivas (también para Incierta); la calidad insuficiente bloquea toda transición y rompe la candidatura. Incierta cuenta como «sin Alta» para avanzar un escalón tras 3 minutos de audio desde la última transición, con buena calidad; nunca retrocede por Incierta. Alta aceptada retrocede un escalón de inmediato, reprograma las rampas desde los valores actuales y reinicia la permanencia. Sin cola de decisiones obsoletas; tras reanudar el audio se exige histéresis fresca. Duraciones: tempo máx(20 s, \|ΔBPM\| × 2 s); modo 30 s al cierre de ciclo; capas 30 s; brillo y reverberación 45 s. |
| RNF-02 | Se registran dos intervalos. Retroceso por Alta: < 2 s desde la aceptación tras la histéresis. Avance por Baja o Incierta: < 2 s desde la elegibilidad (final de la permanencia de 180 s y criterios vigentes); desde la aceptación puede superar 2 s por la espera obligatoria. La interfaz indica que se conserva el escalón hasta completar su duración. |
| Desviación | Completa los umbrales de R-05 y reemplaza las prioridades de `diseno-musical.md`. |
| Consecuencias | La interfaz muestra «Confianza no calibrada · reglas provisionales». Escenario `progressive_activation` del simulador para probar el retroceso. Ajuste de `levels.ts` con 3–5 oyentes propuesto aparte. |

## ADR-13. Calendario de entrega hasta el 17 de noviembre

| Campo | Contenido |
|---|---|
| Estado | Aprobado el 5 oct 2026. |
| Contexto | El cronograma de la especificación termina después de la entrega obligatoria del 17 nov. |
| Decisión | Desarrollo hasta el 12 nov; publicación y revisión el 13 y el 17 nov. Lunes a viernes, excluyendo los festivos 12 oct, 2 nov y 16 nov. Detalle en `plan-entrega.md`. |
| Desviación | Sustituye solo el calendario de ejecución; no elimina RF ni HU. |
| Consecuencias | 27 días efectivos, 25 de esfuerzo y 2 de reserva (15–16 oct). Ningún dato de salud se abre en la nube sin `aal2`. |

## ADR-14. Entrega con reglas (R-05); entrenamiento no iniciado

| Campo | Contenido |
|---|---|
| Estado | Decisión del usuario el 5 oct 2026, tras comprobar que no existe rama, script, dataset etiquetado ni modelo de entrenamiento. |
| Decisión | El estimador de entrega son las reglas de ADR-12 (alternativa R-05). Se retira S5.3 ONNX y sus dos días pasan a reserva. ONNX solo como mejora opcional al final, si sobra tiempo, con un contrato de etiquetas definido por el usuario y aprobación expresa. |
| Desviación | RF-07 queda limitado: no se entrega el clasificador entrenado de la especificación ni se afirma su cumplimiento literal. |
| Consecuencias | Confianza no calibrada y visible. Los registros nsr2db son datos de prueba de señal, sin etiquetas de activación. |

## ADR-15. Procesamiento de señal: filtrado, calidad y espectro

| Campo | Contenido |
|---|---|
| Estado | Filtrado aprobado el 29 sep 2026 (S2); espectro implementado el 6 oct 2026 (S5). Valores provisionales, a revisar con datos reales. |
| Filtrado (RF-04) | RR plausible 300–2000 ms. Se descarta un RR que se aparte más del 20 % de la mediana de los 5 NN aceptados previos (regla del 20 %, Malik et al., 1989, referencia exacta por verificar; Task Force, 1996). Al arrancar se acepta todo lo que esté en rango hasta reunir 5 latidos; tras 5 descartes seguidos por desviación, esos 5 pasan a ser la referencia. |
| Calidad | Hueco: más de 3 s sin RR. Pérdida de contacto: `sensorContact: false`, con sus RR descartados. Ambos marcan baja calidad y rompen la continuidad. Baja calidad también con menos del 80 % de latidos aceptados en 30 s. Índices solo con 60 s de NN válidos en la ventana de 5 min. El RMSSD solo usa pares adyacentes, ambos aceptados y sin hueco. |
| Espectro (RF-06) | Tramo continuo más reciente de la ventana (≥ 2 min y ≥ 80 % aceptados). Eje de tiempo por suma acumulada de RR; spline cúbica natural a 4 Hz con los descartados interpolados; tendencia lineal eliminada; ventana Hann; FFT radix-2 con relleno de ceros; periodograma unilateral en ms²/Hz. LF 0,04–0,15 Hz y HF 0,15–0,4 Hz. Referencia sintética: 800 y 200 ms² teóricos dan 799,5 y 194,3 ms². Welch y Lomb-Scargle quedan como alternativas. |
| Escenario `artifacts` | Reposo con 2 % de pares prematuro (70 % del RR) más compensatorio, y pérdida de contacto de 5 s cada 90 s, con un generador aleatorio aparte para no alterar la serie base. |
| Consecuencias | LF/HF se muestra, pero no entra en el lazo de adaptación. |

## ADR-16. Seguridad del audio

| Campo | Contenido |
|---|---|
| Estado | Aprobado el 29 sep 2026 (S3). |
| Decisión | Ganancia maestra de −12 dB por defecto y aviso de volumen moderado. Compresor al final de la cadena (umbral −6 dBFS, 20:1) más recorte suave en el worklet con techo de −1 dBFS, porque el compresor no garantiza el máximo. Planes de 10 a 60 minutos, aviso al final del plan y fundido de 20 s si no hay respuesta en 2 minutos. Detener: rampa a cero en 50 ms y pausa del contexto, con botón fijo, tecla Esc (solo sin diálogo abierto) y Media Session. |
| Consecuencias | HU-06 (silencio < 200 ms) se cumple con margen. Los subdesbordamientos se miden con `AudioContext.playbackStats`: 60 s en cada PR y 30 min a mano o programado. |

## ADR-17. Fuentes de señal: Bluetooth, simulador y registros

| Campo | Contenido |
|---|---|
| Estado | Aprobado el 29 sep 2026; Bluetooth implementado el 6 oct 2026 (S5). |
| Decisión | Tres fuentes tras el contrato `SignalSource`: simulador, banda Bluetooth y dos extractos de 30 minutos de PhysioNet nsr2db 1.0.0 (ODC-By 1.0, créditos en `public/recordings/CREDITS.md`), versionados como JSON de unos 25 KB. Bluetooth reintenta a 1, 2, 4 y 8 s tras perder el enlace, sin reiniciar el tiempo de señal, y ofrece «Reconectar banda» con `getDevices()` cuando el navegador lo expone. |
| Desviación | Versionar los extractos es una excepción a la regla de no versionar datos, aprobada por el usuario. |
| Consecuencias | La app se demuestra sin banda. La emulación con nRF Connect prueba el protocolo, no la precisión de una banda real. |

## ADR-18. Cuenta, datos y privacidad

| Campo | Contenido |
|---|---|
| Estado | Aprobado el 29 sep 2026; se implementa en S6. |
| Decisión | Supabase Auth con correo y contraseña (confirmación y recuperación por SMTP de Gmail con contraseña de aplicación) y Google por redirección, más TOTP (ADR-10). Proyecto Supabase propio en us-east-1, con una consulta programada cada 3 días para evitar la pausa del plan gratuito. Campo de consentimiento de sincronización en `profiles`. Las sesiones usan UUID v7 generado en el cliente con envío idempotente. Se añaden `DELETE /v1/sessions/{id}` y `DELETE /v1/account`, con borrado en cascada. Página `/privacy` (Ley 1581 de 2012) con consentimiento explícito. NeuroMelody documenta su patrón de login en `docs/autenticacion.md`. |
| Desviación | Los dos DELETE no están en la Tabla 15. |
| Consecuencias | Requiere una migración nueva en S6 (aal2, consentimiento, UUID del cliente). El historial local se ve y se borra sin cuenta. |

## ADR-19. Frontend y backend en repositorios y despliegues separados

| Campo | Contenido |
|---|---|
| Estado | Aprobado el 6 oct 2026, por requisito del profesor. |
| Contexto | El documento despliega la API FastAPI como funciones del mismo proyecto de Vercel, bajo una sola URL. |
| Decisión | Dos repositorios y dos proyectos de Vercel (plan Hobby): este repositorio (frontend) y `NeuroM_Back` (API FastAPI). Localmente viven en `NeuroMelody/front` y `NeuroMelody/back`. El frontend llama a la API por `VITE_API_BASE_URL`; la API solo admite por CORS los orígenes del frontend; la identidad viaja como JWT de Supabase en la cabecera `Authorization`, sin cookies. Los documentos comunes viven en `front/docs`. |
| Desviación | Cambia la ubicación de la API respecto de la Tabla 16 y del despliegue descrito; no cambia sus responsabilidades ni sus puntos de acceso. |
| Consecuencias | La CSP del frontend debe incluir la URL de la API en `connect-src`, y la reescritura de `vercel.json` ya no necesita excluir `/api/`. El análisis y la música siguen en el navegador: el lazo de control no pasa por el servidor. |

## ADR-20. Ramas `main` y `dev`

| Campo | Contenido |
|---|---|
| Estado | Aprobado el 6 oct 2026; sustituye las ramas por sprint. |
| Decisión | En ambos repositorios: `main` es la versión estable y entregable; `dev`, la integración diaria. El trabajo se hace en ramas cortas `feat/…`, `fix/…`, `docs/…` o `chore/…` que salen de `dev` y vuelven por pull request. Una entrega es un pull request de `dev` a `main`. |
| Consecuencias | El CI se ejecuta en los pull request hacia `dev` y hacia `main`. Vercel publica en producción desde `main` y genera vistas previas para las demás ramas. |

## Decisiones menores aprobadas

| Tema | Decisión |
|---|---|
| Enrutador | react-router en modo declarativo, sin cargadores de datos (S3). |
| Pruebas de navegador | Playwright 1.63.0 con Chrome y Edge instalados (S3). |
| Licencia | MIT para el código. |
| Cabeceras | COOP, COEP, CSP y HSTS en `vercel.json`, también aplicadas en el servidor de desarrollo de Vite. |
| Media Session | Se probó solo con Web Audio; si el sistema no muestra controles, basta el botón fijo. |
