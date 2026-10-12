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
| Decisión | Todo el código va en inglés: identificadores, archivos, carpetas, rutas de la URL, variables CSS, nombres de pruebas y comentarios. Los mensajes de commit también. Solo quedan en español los textos que ve el usuario, en los diccionarios de traducción (ADR-25), y los documentos de `docs/`. La interfaz podrá ofrecerse también en inglés. |
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

## ADR-13. Calendario de entrega (retirado)

| Campo | Contenido |
|---|---|
| Estado | Aprobado el 5 oct 2026; **retirado el 7 oct 2026** por decisión del usuario. |
| Decisión | No hay calendario con fechas. El trabajo se ordena por prioridad en `plan-entrega.md` y avanza bloque a bloque. |
| Consecuencias | Las tareas no tienen fecha límite propia; el orden sigue la ruta crítica. Ningún dato de salud se abre en la nube sin `aal2`. |

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
| Decisión | Tres fuentes tras el contrato `SignalSource`: simulador, banda Bluetooth y dos extractos de 30 minutos de PhysioNet nsr2db 1.0.0 (ODC-By 1.0, créditos en `public/recordings/CREDITS.md`), versionados como JSON de unos 25 KB. Bluetooth reintenta a 1, 2, 4 y 8 s tras perder el enlace y después cada 8 s hasta cerca de un minuto (ampliado el 7 oct 2026 tras la prueba manual), con un máximo de 10 s por intento y sin reiniciar el tiempo de señal, y ofrece «Reconectar banda» con `getDevices()` cuando el navegador lo expone. |
| Desviación | Versionar los extractos es una excepción a la regla de no versionar datos, aprobada por el usuario. |
| Consecuencias | La app se demuestra sin banda. La emulación con nRF Connect prueba el protocolo, no la precisión de una banda real. Desde el 7 oct hay una cuarta fuente experimental, la cámara del celular (propuesta P-01), pendiente de prueba en un teléfono real antes de pasar a decisión. |

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

## ADR-21. CSP sin `'wasm-unsafe-eval'`

| Campo | Contenido |
|---|---|
| Estado | Aprobado el 6 oct 2026. |
| Contexto | La directiva solo hacía falta para ONNX Runtime Web, retirado por ADR-14. La aplicación no compila ningún módulo WebAssembly; `/diagnostics` solo comprueba que la API exista. |
| Decisión | `script-src 'self'` sin `'wasm-unsafe-eval'` en `vercel.json` (y por tanto en la vista previa local, que reutiliza esas cabeceras). |
| Consecuencias | CSP más estricta. Si se retoma ONNX, la directiva vuelve con su justificación. |

## ADR-22. Migraciones de la base de datos en el repositorio del backend

| Campo | Contenido |
|---|---|
| Estado | Aprobado el 6 oct 2026. |
| Contexto | Con ADR-19 la API es la dueña de la persistencia. |
| Decisión | `supabase/migrations/` y la prueba que exige RLS en todas las tablas pasan a `NeuroM_Back` (pytest). El frontend ya no contiene el esquema. |
| Consecuencias | Las migraciones nuevas de S6 (`aal2`, consentimiento, UUID del cliente, ADR-23) se escriben en el backend. El historial anterior del esquema queda en el repositorio del frontend. |

## ADR-23. Autovaloración antes y después de la sesión

| Campo | Contenido |
|---|---|
| Estado | Aprobado el 6 oct 2026; se implementa en S6.1 junto con el registro de sesiones. |
| Decisión | Pregunta opcional «¿Cómo te sientes? 0–10» al empezar y al terminar cada sesión. El historial y el resumen la muestran junto a la evolución de la señal. |
| Desviación | Amplía RF-14 a RF-16 con dos campos que la especificación no define. |
| Consecuencias | Conecta el proyecto con el dolor sin medirlo: quien informa es la persona. La interfaz no la presenta como medida clínica ni la compara con un umbral. Requiere dos columnas nuevas en `sessions`, validadas en 0–10. |

## ADR-24. Vista sencilla de la sesión

| Campo | Contenido |
|---|---|
| Estado | Aprobado el 6 oct 2026. |
| Decisión | `/session` muestra por defecto lo que necesita alguien que escucha: estado en palabras, progreso, volumen y Detener. Las métricas (RMSSD, SDNN, LF/HF) y la gráfica pasan a un panel plegable «Ver detalles técnicos», accesible con teclado. |
| Consecuencias | RF-12 se mantiene: todo sigue visible al desplegar el panel. Se refleja en `docs/pantallas.md` antes de construirse. |

## ADR-25. Nada fijo en el código: configuración, catálogos y diccionarios

| Campo | Contenido |
|---|---|
| Estado | Aprobado el 7 oct 2026 por instrucción del usuario («no tiene que haber nada quemado en código»). |
| Contexto | Una auditoría encontró unos 300 textos de interfaz dentro de los componentes, listas de opciones y valores por defecto repetidos, umbrales sin nombre, rutas escritas a mano en una docena de sitios y variables de entorno declaradas pero nunca leídas. |
| Decisión | Sin dependencias nuevas. (1) **Entorno:** solo `src/config/env.ts` lee `import.meta.env` y valida los valores al arrancar. (2) **Rutas:** `src/config/routes.ts`. (3) **Opciones elegibles:** catálogos por funcionalidad (`*Catalog.ts`) con identificadores `as const`, tipo derivado, valor por defecto y `parseOption` en la frontera. (4) **Valores ajustables:** constantes con nombre y documentadas, en un único módulo por dominio (`thresholds.ts`, `levels.ts`, `ramps.ts`, `config.ts`). (5) **Textos:** diccionarios por área en `src/i18n/es/`; los textos con cifras son funciones con parámetros, así que ningún número se escribe dentro de una frase. (6) **Errores:** la lógica lanza errores con `code`; la interfaz los traduce. (7) **Diseño:** solo variables CSS en inglés; las rejillas que dependen de un catálogo reciben `--option-count`. (8) **Backend:** configuración desde el entorno validada con Pydantic y errores con código. |
| Consecuencias | Cambiar una opción, un umbral o un texto toca un solo archivo. Las pruebas usan el diccionario y las constantes en lugar de repetir literales. El tipo `Messages` obliga a que otro idioma tenga las mismas claves. |

## ADR-26. Ajustes visibles tras «nada fijo en el código» (P-02)

| Campo | Contenido |
|---|---|
| Estado | Aprobado el 7 oct 2026 («Sí, aplica las mejoras»). |
| Contexto | La limpieza de ADR-25 no cambió textos ni comportamiento a propósito y dejó once decisiones visibles abiertas. |
| Decisión | (1) Errata del doble punto corregida. (2) La interfaz no muestra textos crudos del navegador (audio, caída del Worker, descarga de un registro, historial): usa el diccionario; el detalle técnico queda solo en `/diagnostics`. (3) Una sola clave para el consejo de navegador de la cámara, para el aviso de reglas provisionales y para el aviso no clínico de los indicadores. (4) Las columnas del CSV siguen en español: el archivo es para la persona y su terapeuta; si hiciera falta para scripts, se añade otra exportación. (5) El aviso de error de la fuente se elige por el tipo de error, no por la fuente seleccionada. (6) La regla de hueco o pérdida de contacto vive en el Worker de señal, que envía un evento `contact`. (7) Cada registro de ejemplo declara su duración en el catálogo. (8) Los minutos del resumen se redondean hacia abajo en todos los casos. (9) `index.html` y el manifest se generan al compilar desde `APP_NAME`, el idioma, el diccionario y los tokens CSS. (10) Backend: CORS admite las vistas previas de Vercel solo con la forma `https://<proyecto>-<hash de 9>-<equipo>.vercel.app`, configurada con `VERCEL_PREVIEW_PROJECT` y `VERCEL_PREVIEW_TEAM` (opcionales y juntas); los alias de rama quedan fuera. (11) Backend: `httpx2` 2.13.1 en lugar de `httpx` para el `TestClient`. |
| Consecuencias | Para activar las vistas previas hay que definir las dos variables en Vercel. |

## ADR-27. Objetivos del plan (P-03)

| Campo | Contenido |
|---|---|
| Estado | Aprobado el 7 oct 2026; el usuario delegó la lista. |
| Decisión | Catálogo `GOAL_IDS` con ids en inglés y textos en el diccionario, sin lenguaje clínico: `relax`, `rest_before_sleep`, `calm_after_activity`, `slow_breathing` y `pause`. Selección múltiple y opcional en `/plan`; viajan a `/session` en `QUERY_PARAMS.goals` (validados en la frontera, en orden del catálogo y sin repetir), se guardan en `SessionRecord.goals` y se muestran en el resumen y en el historial. |
| Consecuencias | Los registros guardados antes de este cambio se leen con la lista vacía. Con la nube (S6.2) se guardan en `plans.goals`. Los objetivos no cambian la música: solo describen la intención de la sesión. |

## ADR-28. Portada pública con animación y escena 3D

| Campo | Contenido |
|---|---|
| Estado | Aprobado el 7 oct 2026 por el usuario («una pantalla de inicio con animaciones… como una página real en producción»; eligió three.js y la ruta `/` para la portada con la app en `/app`). |
| Contexto | `diseno-visual.md` excluía animaciones decorativas y degradados en las pantallas de la app. Falta una página que explique el proyecto a quien llega por primera vez. |
| Decisión | `/` pasa a ser una portada pública con su propio diseño (noche de bosque en la cabecera y el papel de la app en el resto) y el inicio de la app se mueve a `/app`. La cabecera muestra una escena 3D con `three` 0.180.0 (y `@types/three` 0.180.0 en desarrollo): una esfera de partículas que late con un corazón simulado y un pentagrama de cinco líneas a su alrededor. three.js se carga de forma diferida, solo en la portada y solo si hay WebGL; sin WebGL queda una figura en CSS. Animaciones de entrada y al desplazarse, todas desactivadas con `prefers-reduced-motion`; la escena se detiene fuera de pantalla y con la pestaña oculta. Colores, medidas y tiempos son tokens de `index.css`; textos en `src/i18n/es/landing.ts`. |
| Consecuencias | La excepción a «sin animaciones decorativas» vale solo para la portada; las pantallas de escucha siguen sobrias. El manifest abre la app en `/app`. Las cifras de la cabecera son de un corazón simulado y lo dicen. |

## ADR-29. Cuenta en el navegador con `@supabase/supabase-js`

| Campo | Contenido |
|---|---|
| Estado | Aprobado el 7 oct 2026 (el usuario aprobó `@supabase/supabase-js` 2.58.0 y la cuenta real). |
| Decisión | La biblioteca oficial de Supabase gestiona en el navegador el registro con confirmación por correo, la entrada, la recuperación de contraseña y el segundo factor TOTP, con flujo PKCE y la clave pública (las tablas tienen RLS). Se carga de forma diferida desde `AuthProvider`, así que las pantallas de escucha no la descargan. La interfaz depende de la interfaz `AuthService`; los errores de Supabase se traducen a códigos (`AccountErrorCode`) y nunca se muestra su texto. TOTP admite varios dispositivos: un segundo dispositivo es la vía de recuperación, porque Supabase no emite códigos de respaldo. El consentimiento de sincronización se guarda por ahora en el dispositivo. |
| Consecuencias | En el panel de Supabase hay que permitir las URL de redirección (`/account` del despliegue y de `localhost:5173`) y activar TOTP. Quedan para la tarea C: borrar la cuenta (DELETE de ADR-18), llevar el consentimiento a `profiles` y sincronizar sesiones con `aal2`. |

## ADR-30. Rediseño completo: tema nocturno, acceso propio y perfil

| Campo | Contenido |
|---|---|
| Estado | Aprobado el 10 oct 2026 por el usuario, tras revisar la portada («el resto de la app pierde sentido… debes mejorar toda la app»). |
| Contexto | Solo la portada tenía el nivel visual deseado; el inicio, el plan y la sesión se veían básicos, la cuenta mezclaba registro y ajustes, y la portada usaba recursos y secciones que el usuario rechazó (sección de tecnología, enlace al código, titular con una palabra resaltada). |
| Decisión | (1) **Tema:** la «noche de bosque» de la portada pasa a toda la app; se cambian los tokens base de `index.css` (fondo verde profundo, tinta clara, acento ámbar) y las pruebas de contraste siguen exigiendo 4,5:1 y 3:1. (2) **Figura común:** `BreathingOrb`, un orbe en CSS que respira y puede latir; en la sesión toma el tono del estado y late con el pulso real. (3) **Portada:** lenguaje llano, sin sección de tecnología ni código fuente, titular sobrio y un trazo del pulso simulado en vivo como demostración. (4) **Acceso:** pantallas propias `/login`, `/register`, `/forgot-password` y `/reset-password`; la portada lleva a ellas y todas dejan «Continuar sin cuenta», porque escuchar sigue sin exigir cuenta (ADR-18). Registro con correo y contraseña repetida, sin correo de confirmación. «Continuar con Google» consulta antes si el proyecto lo tiene activo. La recuperación envía un enlace por el SMTP propio que el usuario configura en Supabase. (5) **Perfil:** `/account` es resumen y ajustes, accesible desde el avatar. (6) **Inicio, plan y sesión** rediseñados (detalle en `pantallas.md`). |
| Consecuencias | Sustituye la dirección «papel marfil» de `diseno-visual.md` y la restricción de ADR-28 a la portada. En Supabase el usuario debe: desactivar «Confirm email», configurar un SMTP propio, activar el proveedor Google con sus credenciales y añadir `/app` y `/reset-password` a las URL de redirección. Sin dependencias nuevas. |

## ADR-31. Tema claro y oscuro, e interfaz en español e inglés

| Campo | Contenido |
|---|---|
| Estado | Aprobado el 10 oct 2026 por instrucción del usuario («debe tener dark and light, además de español e inglés»; «combinar el verde con el blanco de antes»). |
| Decisión | **Temas:** dos paletas escritas una sola vez en `index.css`, noche de bosque y papel marfil. El tema oscuro es fondo verde con tarjetas marfil; el claro es fondo marfil con tarjetas verdes. Una superficie con la clase `.paper` toma la paleta contraria a la de la página y `.night` conserva la oscura en cualquier tema (cabecera de la portada, cuya escena 3D está pensada para fondo oscuro). `data-theme` en el documento elige el tema; la preferencia es «como el sistema», claro u oscuro. **Idiomas:** diccionario `src/i18n/en/` con la misma forma que el español (el tipo `Messages` lo exige al compilar); el español es el idioma por defecto. **Controles:** botones de tema e idioma en las cabeceras y selectores en el perfil; ambas preferencias se guardan en el dispositivo y se validan al leerlas. |
| Consecuencias | Toda clave nueva debe añadirse en los dos diccionarios. El CSV se exporta en el idioma de la interfaz. La gráfica de la señal toma la paleta al abrir la sesión: si se cambia el tema con la sesión abierta, la gráfica conserva los colores anteriores hasta recargar. Las pruebas de contraste verifican la paleta oscura; la clara es la que ya estaba verificada antes de ADR-30. |

## ADR-32. Clasificador de activación entrenado

| Campo | Contenido |
|---|---|
| Estado | Aprobado el 11 oct 2026 por el usuario («sin IA no puedo presentar el proyecto, y no puede ser generativa»). Sustituye a ADR-14 en lo que limitaba RF-07. |
| Contexto | El estado se estimaba con reglas fijas (ADR-12) porque no había datos etiquetados ni modelo. El proyecto necesita un modelo de aprendizaje automático propio, no generativo. |
| Decisión | Un clasificador supervisado (regresión logística multinomial de tres clases con confianza calibrada) entrenado con el conjunto público WESAD. Contrato de etiquetas: meditación → `low`, reposo y vídeos divertidos → `uncertain`, estrés inducido → `high`. Entradas: FC media, RMSSD y SDNN respecto a la línea base de la persona. Se entrena fuera de la app (`back/training/`, con numpy, scipy y scikit-learn solo para entrenar) y se entrega como un archivo JSON estático (`public/models/activation-classifier.json`, ADR-09) que el navegador ejecuta como aritmética: sin ONNX, sin WebAssembly (ADR-21 se mantiene) y sin dependencias nuevas en la app. Las reglas de ADR-12 quedan como respaldo si el archivo no carga. Ficha completa en `docs/modelo.md`. |
| Resultado | Validación dejando una persona fuera: acierto equilibrado 71,9 % frente al 62,4 % de las reglas; F1 macro 0,71 frente a 0,64. |
| Consecuencias | La pantalla indica «Estimado por un modelo entrenado» con su confianza, o las reglas provisionales si actúa el respaldo. La histéresis, las permanencias y las rampas no cambian. Cambiar el filtro de latidos, la ventana o la línea base obliga a reentrenar. No es una validación clínica: 15 personas sanas en laboratorio. El conjunto de datos no se versiona. `GET /v1/models/classifier` de la Tabla 15 no es necesario mientras el modelo sea un archivo estático. |

## ADR-33. Funciones que hacen útil la app más allá de la demostración

| Campo | Contenido |
|---|---|
| Estado | Aprobado el 11 oct 2026 por el usuario («anota todas, por orden de facilidad y urgencia»). |
| Contexto | La app adapta la música al pulso, pero da pocos motivos para volver y no muestra si sirve. Ninguna de estas funciones estaba en la especificación. |
| Decisión | Se añaden seis funciones, en este orden dentro del plan (`plan-entrega.md`): (1) **Respiración guiada:** el orbe de la sesión marca un ritmo lento de inhalar y exhalar, opcional, sincronizado con la música; da contenido al objetivo «Acompañar una respiración lenta». (2) **Tu progreso:** vista con la evolución entre sesiones del pulso, la variabilidad y la autovaloración antes y después. (3) **Recolección de datos y reentrenamiento:** un protocolo guiado y corto (reposo, respiración lenta, tarea exigente) que guarda cada tramo con su etiqueta, con consentimiento explícito; los datos se exportan, se reentrena en `back/training/` y se publica una nueva versión del modelo (ADR-32). El modelo nunca se reentrena solo dentro de la app. (4) **Informe para el terapeuta:** resumen imprimible de un periodo, hecho con la impresión del navegador. (5) **Paisaje sonoro:** elegir entre dos o tres timbres o ambientes. (6) **Recordatorios** a la hora elegida, donde el navegador lo permita. |
| Consecuencias | Cada función se ubica en `pantallas.md` y se planifica antes de programarse. Todas mantienen el lenguaje no clínico: describen, no prometen efectos. Sin dependencias nuevas previstas para (1), (2) y (4). La (3) necesita la API; la (5) toca el motor de audio y exige repetir la prueba de audio; la (6) depende de permisos y varía entre sistemas, así que puede quedar limitada. |

## ADR-34. Sesiones en la nube: contrato de la API y sincronización

| Campo | Contenido |
|---|---|
| Estado | Aprobado el 11 oct 2026 por el usuario (versiones, clave pública en el back, contrato y los tres puntos de detalle). Concreta ADR-10, ADR-18 y ADR-19. |
| Decisión | **API:** `POST`/`GET /v1/sessions`, `GET`/`DELETE /v1/sessions/{id}` y `DELETE /v1/account`, con `Authorization: Bearer <token de Supabase>`. El token se verifica con las claves públicas del proyecto (ES256) usando PyJWT 2.15.1 y `cryptography` 50.0.2; las rutas de sesiones exigen `aal2`. Errores con código: `unauthenticated` (401), `second_factor_required` y `consent_required` (403), `not_found` (404), `session_conflict` (409), `invalid_request` (422) y `storage_unavailable` (502). **Doble barrera:** la API llama a Supabase con `httpx2` y el token de la persona, así que RLS vuelve a comprobar propiedad y segundo factor; para identificar el proyecto usa la clave pública (`SUPABASE_ANON_KEY`, variable nueva del back) y la clave de servicio queda solo para borrar la cuenta. **Base de datos:** una migración nueva añade el consentimiento a `profiles`, los campos de una sesión del dispositivo, `good_quality` en `session_metrics`, políticas restrictivas de `aal2` y cuatro funciones (`save_session`, `list_sessions`, `get_session`, `delete_session`) que guardan o leen la sesión completa en una sola llamada. Los objetivos y la duración van en `plans` (ADR-27). **Envío idempotente:** el id es el UUID v7 del dispositivo; reenviar una sesión no la duplica y solo actualiza la valoración final. **Consentimiento:** lo escribe el front en `profiles`; con cuenta solo vale ese, y la base de datos rechaza guardar sin él. **Sincronización:** las sesiones de la nube se copian al dispositivo, que sigue siendo de donde leen todas las pantallas; unas marcas por cuenta distinguen «nunca enviada» de «borrada desde otro dispositivo»; borrar no espera a la nube (aprobado el 12 oct 2026, bloque 16): la sesión se borra primero del dispositivo y, si estaba en la cuenta, su borrado queda en una cola por cuenta hasta que la nube lo confirme; la sincronización entrega esa cola antes de leer la nube, para que la sesión no vuelva a aparecer. |
| Desviación | `good_quality` y `SUPABASE_ANON_KEY` no estaban en el plan anotado. La cuenta con segundo factor solo se puede borrar desde una sesión que lo pasó. |
| Consecuencias | Desde el bloque 16 se puede borrar sin conexión; la app sincroniza sola cuando la conexión vuelve. El back necesita cinco variables en Vercel. La CSP del front debe incluir la URL del back en `connect-src` cuando se despliegue. La migración se prueba en local con la CLI de Supabase 2.120.0 por `npx` y Docker; la aplica el usuario en el SQL Editor. |

## ADR-35. Modo de prueba: el simulador y los registros de ejemplo no son sesiones de la persona

| Campo | Contenido |
|---|---|
| Estado | Aprobado el 12 oct 2026 por el usuario («el centro de la app es tu propio pulso»; el simulador y los ejemplos «simplemente servirían para probar la app»). |
| Contexto | El simulador y los registros de ejemplo aparecían en el selector junto a la banda y la cámara, y sus sesiones se guardaban, contaban en el progreso y podían llegar al informe o a la nube como si fueran de la persona. |
| Decisión | El panel de fuente ofrece solo las que miden a la persona (banda y cámara). El simulador y los registros pasan a un **modo de prueba** que se abre con un enlace, lo dice en pantalla y no guarda nada: una sesión de prueba no va al historial, al progreso, al informe ni a la nube, y una grabación guiada de prueba no se guarda ni se exporta. Las sesiones de prueba guardadas antes de esta regla siguen en el historial, donde se pueden borrar, y no cuentan en ninguna cifra. El rasgo `trial` de `sourceTraits.ts` es la única fuente de verdad. |
| Consecuencias | Se mantienen para la demostración sin sensor (RF-02) y para las pruebas automáticas, que entran al modo de prueba. La prueba de extremo a extremo del historial ya no puede grabar una sesión guardable desde un navegador sin sensor: la deja escrita en el almacenamiento. Qué fuentes reales añadir se estudia en `fuentes-de-pulso.md`. |

## ADR-36. El resumen automático se escribe con las cifras que envía el navegador

| Campo | Contenido |
|---|---|
| Estado | Aprobado el 12 oct 2026 por el usuario. Concreta ADR-08 para RF-15. |
| Contexto | La primera versión leía la sesión de la nube en el servidor, así que el resumen solo existía para quien tuviera dos pasos, consentimiento de sincronización y la sesión ya subida. |
| Decisión | `POST /v1/sessions/{id}/summary` recibe `figures`: las cifras agregadas que la pantalla de resumen ya muestra, en un esquema cerrado de números enteros dentro de rango y valores de catálogo. No lee ni guarda nada, no envía el `id`, y basta una cuenta (no pide `aal2`): la respuesta no contiene ningún dato que quien llama no haya enviado. Sigue exigiendo `consent: true`. |
| Desviación | La ruta de la Tabla 15 se mantiene, pero ya no lee la sesión guardada. |
| Consecuencias | Funciona con cualquier cuenta y con sesiones que solo están en el dispositivo, sin obligar a guardar datos de salud en la nube. El servidor no puede saber si las cifras son reales; quien las altere solo cambia su propio texto. El resto del contrato del modelo de lenguaje (propuesta de duración, código de error único, filtro de lenguaje clínico) está descrito en el README del back. |

## ADR-37. Reentrenamiento con grabaciones enviadas, control de calidad y publicación con aprobación

| Campo | Contenido |
|---|---|
| Estado | Aprobado el 12 oct 2026 por el usuario («sí», «con clic mío para publicar»; combinar con WESAD evaluando primero y no publicar con menos de 5 personas). Resuelve la propuesta P-04 y amplía ADR-32 y ADR-33. |
| Contexto | El modelo se entrenaba a mano con WESAD y la app lo traía como archivo fijo. Las grabaciones guiadas solo podían exportarse como archivo. |
| Decisión | (1) **Envío consentido:** la persona puede enviar cada grabación guiada (`POST /v1/recordings`), con un consentimiento propio y segundo factor, y retirarla cuando quiera; se guardan en `training_recordings`, con RLS. (2) **Entrenamiento programado** en GitHub Actions, gratuito en repositorios públicos: entrena con WESAD y con las grabaciones, dejando fuera a cada persona por turno. (3) **Control de calidad:** el modelo nuevo solo puede publicarse con al menos 5 personas de la app, si en ellas acierta al menos igual que el modelo entrenado solo con WESAD y si en WESAD no pierde más de un punto. (4) **Publicación con aprobación:** el paso que publica espera a una persona (entorno `model-release` con revisor obligatorio) e inserta la versión en `model_versions`, con su archivo y su suma de comprobación. (5) **La app descarga la última versión** (`GET /v1/models/classifier`, de la Tabla 15) al abrir una sesión con cuenta, la valida, la conserva para cuando no hay red y, si no hay ninguna o no valida, usa la que trae. |
| Desviación | Hay latidos en la nube por primera vez (antes solo indicadores agregados), siempre por decisión expresa de la persona; `/privacy` lo explica. La clave de servicio de Supabase está también en los secretos de GitHub. `model_versions` guarda el archivo del modelo en una columna en lugar de una ruta de almacenamiento. |
| Consecuencias | El modelo nunca se entrena ni se publica solo dentro de la app. Sin cuenta, la app usa el modelo que trae. La caché de latidos de WESAD vive en una tabla privada (`training_assets`), no en el repositorio. Cada versión publicada debe llevar sus cifras y límites a `modelo.md`. Requiere una migración (`20261012000000_training_recordings.sql`) y una preparación única en Supabase y GitHub, descrita en `back/training/README.md`. |

## Decisiones menores aprobadas

| Tema | Decisión |
|---|---|
| Enrutador | react-router en modo declarativo, sin cargadores de datos (S3). |
| Pruebas de navegador | Playwright 1.63.0 con Chrome y Edge instalados (S3). |
| Licencia | MIT para el código. |
| Cabeceras | COOP, COEP, CSP y HSTS en `vercel.json`, también aplicadas en el servidor de desarrollo de Vite. |
| Dependencias del back en Vercel | Vercel instala las `dependencies` de `pyproject.toml` e ignora `requirements.txt` cuando existen los dos. Las dos listas llevan los mismos paquetes fijados y una prueba lo comprueba (12 oct). |
| Media Session | Se probó solo con Web Audio; si el sistema no muestra controles, basta el botón fijo. |
