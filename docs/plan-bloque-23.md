# Plan del bloque 23 — «Lo que te funciona»

**19 oct 2026 · Desarrollo y publicación autorizados.** El usuario pidió continuar todas las funciones y terminar los sprints para revisarlos mañana. Se aplicó este plan previamente presentado, incluidos sus límites conservadores, en `feat/block-23` desde `dev`, conservando los ajustes locales anteriores. Tras el cierre local autorizó el push y la integración habitual en `dev` y `main`, solo con su autoría. Los paneles se ubican en `pantallas.md`. Las pruebas físicas y los servicios reales se declaran por separado.

## Situación inicial, antes del desarrollo

- `SessionRecord` guarda fechas, duración prevista y escuchada, objetivos, fuente, valoraciones, muestras y el relato musical opcional (`music`). No guarda instrumento, ambiente ni hora local de la sesión.
- `soundChoices.ts` recuerda la última elección de instrumento y ambiente del dispositivo. Esa preferencia puede haber cambiado: no permite reconstruir elecciones de sesiones anteriores.
- `cloudApi.ts` envía explícitamente los campos del contrato actual. El back rechaza campos adicionales y no guarda `music`, instrumento ni ambiente.
- `summarizeSession.ts` calcula los extremos con muestras de buena calidad; `retentionPolicy.ts` excluye las fuentes de prueba del progreso.
- `plan.ts` permite 10, 15, 20, 30, 45 y 60 minutos. Una duración de 3 en la dirección se sustituye hoy por la predeterminada. La calibración anunciada dura 3 minutos.
- La cámara detecta contacto y latidos. El contrato actual no publica la guía de contacto antes del primer latido y no mide presión del dedo.

## Decisiones autorizadas para el desarrollo

1. **Datos, elección confirmada el 19 oct:** analizar las sesiones disponibles en el dispositivo, incluidas las que ya bajó la sincronización. Añadir contexto a las nuevas sesiones locales; las antiguas conservan sus datos desconocidos. No se amplía la sincronización de este contexto ni se requiere migración remota.
2. **Alcance y orden:** los seis pasos de abajo, empezando por datos y observaciones locales. La redacción se añade después de disponer de cifras verificables. Para mantener los cambios juntos sin fusiones, todos los pasos continúan en `feat/block-23`, creada desde `dev` en ambos repositorios. Los nombres de ramas por paso de abajo pertenecen a la planificación original y no se crearon.
3. **Reglas iniciales:** mínimo de 5 sesiones válidas por grupo, comparaciones por intención y límites de sesión rápida descritos abajo. Son parámetros de producto, no umbrales de validez científica; se documentan en ADR-48.

## 1. Guardar el contexto de las nuevas sesiones

**Rama propuesta:** `feat/session-context`. RF-14, HU-10, RNF-07; ADR-25, ADR-34, ADR-35, ADR-45 y ADR-46.

Guardar con cada nueva sesión el instrumento, ambiente y hora local al empezar. El programa se deriva de la intención con el catálogo vigente; no se atribuyen programas históricos a versiones distintas sin registrar su versión. Reservar identificadores y versión del contexto para poder distinguir cambios futuros. Los datos ausentes siguen ausentes; no se rellenan con la última preferencia del dispositivo ni con la zona horaria actual.

En la opción recomendada estos campos viven solo en el dispositivo. La sincronización y las actualizaciones de valoración deben conservarlos, igual que `music`. No se necesita una migración remota. Se valida todo al leer almacenamiento y direcciones; se mantienen compatibles las sesiones antiguas.

**Archivos:** `records/sessionRecord.ts`, `SessionRecorder.ts`, `sessionStore.ts`, `session/SessionPage.tsx`, catálogos de plan y, si la conservación lo requiere, `cloud/syncSessions.ts`. Pruebas de lectura antigua, valores desconocidos, grabación del contexto real y conservación al valorar o sincronizar.

## 2. «Lo que te funciona» en `/progress`

**Rama propuesta:** `feat/history-insights`. RF-16, HU-10, RNF-07 a RNF-09; ampliación de ADR-33 (2).

Panel después de los totales, antes de las gráficas. Responde al mismo selector de últimas 7, 30 o todas las sesiones. Incluye conteos, observaciones breves y una explicación desplegable de cómo se calcularon. Si faltan datos, explica qué falta sin presentar una opción ganadora.

Reglas propuestas:

- Excluir sesiones de prueba antes de aplicar el selector. Omitir cada sesión solo en las comparaciones cuyos datos le falten.
- Comparar por separado instrumento, ambiente, intención, hora y duración. Para instrumento, ambiente, hora y duración, comparar dentro de una misma intención; para pulso, también con la misma fuente. No atribuir a una elección el efecto de otra ni afirmar causalidad.
- Para valoración, usar solo sesiones con ambas respuestas y el cambio `después − antes`. Comparar las medianas de ese cambio; mostrar también cuántas sesiones tienen ambas respuestas. No convertir una valoración en una afirmación sobre cómo se sintió la persona.
- Para pulso, usar los extremos de buena calidad ya calculados por `summarizeSession`; describir la diferencia sin calificar una bajada como una mejora. No usar pulso ni variabilidad para elegir lo que «conviene» a la persona.
- Exigir al menos **5 sesiones válidas en cada uno de al menos dos grupos** para mostrar una comparación. Un empate al redondear lo visible no produce una preferencia. Una mediana sin diferencia positiva de valoración no genera una sugerencia en el plan.
- Hora local: mañana (06–11), tarde (12–17), noche (18–23), madrugada (00–05), solo si quedó registrada. Duración: minutos realmente escuchados, con grupos menores de 10, de 10 a menos de 20, de 20 a menos de 30 y de 30 en adelante. Estos límites se centralizan en un catálogo y quedan sujetos a aprobación.
- Constancia: días con sesiones y minutos en el grupo seleccionado. No inferir una racha actual de un selector que cuenta sesiones, ni prometer efectos por usar más la app.
- Mostrar como máximo **3 observaciones**, con un orden fijo y explicado; conservar una tabla con los grupos comparables. Las cifras se calculan antes del texto y no cambian por usar el modelo.

Ejemplos de redacción, con cifras ilustrativas: «En tus 5 sesiones con piano, la mediana del cambio de tu valoración fue de +2 puntos; en las 5 con sonido cálido fue de +1». Si falta historial: «Todavía faltan sesiones con ambas valoraciones para comparar sonidos». Acompañar de «Son observaciones de tus sesiones; no demuestran que una elección haya causado el cambio».

**Archivos:** módulos de cálculo y configuración en `features/progress/`, `ProgressPage.tsx`, `progress.css`, diccionarios `i18n/es/progress.ts` e `i18n/en/progress.ts`; nuevos tokens, si hacen falta, en `index.css`.

**Pruebas:** cifras de referencia, mínimo justo por debajo y en el límite, medianas y empates, respuestas ausentes, calidad insuficiente, exclusión de pruebas, campos desconocidos, filtros y separación de fuentes e intenciones. Comprobar panel con datos insuficientes, suficientes y borrado de sesiones.

## 3. «Para ti» en `/plan`

**Rama propuesta:** `feat/personal-plan`. RF-13, HU-07, RNF-08 y RNF-09.

Tarjeta encima de las elecciones: propuesta de sonido, ambiente y duración, con un motivo cuantificado para cada campo que tenga evidencia suficiente. Priorizar el cambio de valoración declarado, usando las reglas del paso 2. Conservar la intención elegida por la persona. No presentar una combinación de preferencias independientes como si se hubiera probado junta.

Propuesta de interacción: **«Usar esta propuesta»** preselecciona los campos respaldados; todos siguen editables. Un historial que termina de cargar nunca reemplaza lo que la persona ya eligió. Los valores explícitos de un enlace se respetan. Si solo hay datos para un campo, proponer solo ese. La duración propuesta debe pertenecer al catálogo permitido; no convertir automáticamente el tiempo escuchado en un plan distinto.

**Archivos:** `plan/PlanPage.tsx`, tarjeta y función de selección en `features/plan/`, reutilización de cálculos del progreso, `plan.css` y diccionarios de ambos idiomas. Pruebas de prioridad del enlace y edición manual, datos insuficientes, duración permitida y aceptación explícita; recorrido E2E de progreso a plan y sesión.

## 4. Redacción opcional con el modelo de lenguaje

**Rama propuesta en ambos repos:** `feat/progress-narrative`. RF-16, RNF-07; amplía ADR-08 y ADR-36, que hoy solo cubren el plan y el resumen de una sesión.

En el panel del paso 2, debajo de las observaciones locales: explicar qué cifras se enviarán y ofrecer «Acepto y quiero una explicación». Requiere cuenta y consentimiento de esa petición. La API no lee el historial de la nube ni cambia las cifras. Sin red, cuenta, consentimiento o respuesta válida, las observaciones locales siguen disponibles.

**Contrato propuesto para acordar antes de programar:** `POST /v1/progress/summary`, cuerpo cerrado con `consent`, `locale` y hasta 3 observaciones calculadas. Cada observación lleva identificador, dimensión y valores de catálogo, conteos y cifras visibles, con unidades y rangos cerrados. Nada de fechas exactas, identificadores de sesión, notas, muestras o señal. Respuesta cerrada con texto, marca de generado y referencias a las observaciones recibidas. Reutilizar los códigos de error de cuenta, consentimiento, petición inválida e indisponibilidad del modelo; no añadir almacenamiento ni migración en la opción local.

Antes de implementar este paso se fija la tabla exacta de campos y límites en el ADR aprobado. La validación debe rechazar cifras o referencias inventadas, atribuciones causales, promesas, consejos y lenguaje clínico; si no se puede validar un texto, se conservan las frases locales. El texto generado se invalida al cambiar el historial, el selector o el idioma, también al valorar o borrar una sesión.

**Archivos:** front `cloud/cloudApi.ts`, panel del progreso y diccionarios; back `app/assistance.py`, `app/routes/assistance.py`, constantes y pruebas de contrato. Comprobar autenticación, consentimiento, cuerpos adicionales, límites, salida inválida y caída del proveedor; E2E con servicio simulado. La llamada real a Groq queda como comprobación separada y requiere la autorización de uso de la clave.

## 5. Nota opcional y sesión rápida

**Ramas propuestas:** `feat/session-note` y `feat/quick-session`. RF-14, RF-15, RF-18; HU-07 y HU-08.

- **Nota en `/summary/:id`:** junto a la valoración final, una frase opcional con límite propuesto de 200 caracteres, guardado explícito y posibilidad de editarla o quitarla. Solo en el dispositivo en la opción recomendada; nunca se envía al modelo. Pruebas de límites, guardado, eliminación y conservación al sincronizar o valorar.
- **Inicio (`/app`):** acceso «Tengo 3 minutos», con la última intención, sonido y ambiente conocidos; si no hay contexto, explicar los valores de inicio. Lleva a las diapositivas y mantiene la aceptación de advertencias y el inicio manual de música.
- **Excepción de duración:** ampliar explícitamente ADR-16 y la validación de rutas para admitir 3 minutos como sesión rápida, conservando el catálogo manual de 10–60. Mantener la calibración de 3 minutos: explicar que puede terminar antes de tener una estimación adaptada. No acelerar el clasificador ni reducir sus ventanas para que encaje.
- Mantener el aviso de fin o cierre silencioso según el programa elegido y Detener siempre disponible. Probar lectura del enlace rápido, advertencias, fin del plan y guardado; E2E del recorrido. Solo repetir `test:audio` si la implementación termina cambiando el motor o los worklets.

**Archivos:** `records/`, `summary/SessionSummaryView.tsx`, `home/HomePage.tsx`, `plan/plan.ts`, `config/routes.ts`, consumo de duración en `session/` y `audio/ui/`, diccionarios y estilos correspondientes. Revisar los límites de duración del back sin ampliar la propuesta del modelo por accidente.

## 6. Guía de cámara en `/session`

**Rama propuesta:** `feat/camera-guidance`. RF-01, RF-12, RNF-09; continúa P-01 sin retirar la etiqueta experimental.

En «Tu pulso», junto a Conectar cámara: estados «Cubre la cámara con el dedo», «Estamos buscando los latidos», «Estamos recibiendo latidos» y «Se perdió el contacto». Publicar el contacto antes del primer latido mediante un estado de guía separado de las muestras fisiológicas; nunca inventar una lectura para poder notificarlo.

«Apoya el dedo sin apretar y mantenlo quieto» es una instrucción de uso. No afirmar que se midió demasiada presión ni que el dedo está bien puesto solo porque se abrió la cámara. No guardar ni enviar imágenes; conservar la guía con teclado y anunciar solo cambios estables.

**Archivos:** `acquisition/camera/CameraSource.ts`, contrato o suscripción de guía, `AcquisitionPanel.tsx`, uso en `session/`, diccionarios y estilos. Pruebas sintéticas de contacto inicial, espera, latidos, pérdida, desconexión y reconexión, sin alterar intervalos ni el análisis. La colocación real y utilidad de la guía las comprueba el usuario con su celular.

## Verificación y cierre

- Sin dependencias nuevas previstas. Textos en los dos idiomas, opciones y límites en catálogos y constantes, estilos con variables de `index.css`.
- Por paso: pruebas de la lógica afectada, typecheck y lint. Verificación visual de claro y oscuro, español e inglés, celular y escritorio; teclado, foco y estados anunciados. Capturas con datos locales de prueba, sin servicios reales.
- Al cerrar código: batería completa y build del front; E2E de los recorridos que cambien. Back: pytest completo si se modifica; contratos y casos negativos de seguridad. Audio solo si cambia su motor.
- Actualizar `pantallas.md`, `plan-entrega.md`, `PROGRESS.md` y las decisiones aprobadas. Declarar pendientes de teléfono real, BLE, escucha y servicios externos. Sin push, fusiones, publicación ni cambios remotos sin orden del usuario.

## Estado de la entrega local

Los seis pasos están implementados en `feat/block-23` en front y back. La autorización de continuar el desarrollo amplió el alcance de la preparación inicial. ADR-48 fija las reglas finales; las referencias a propuestas y ramas individuales de los apartados anteriores conservan el diseño inicial y no representan ramas creadas ni decisiones pendientes.

La redacción del paso 4 se concretó antes del código en `contrato-progress-summary.md`: para verificar íntegramente el lenguaje, la API admite una selección entre presentaciones revisadas y referencias exactas, sin prosa libre del proveedor. Los datos siempre los calcula el navegador. No se modifica el contrato de sesiones ni se requieren migraciones.

También se conservan los ajustes anteriores de desvanecido, Google Calendar y diagnóstico de audio. La comparación física al bloquear el Xiaomi y el calentamiento siguen abiertos. La evidencia final, el resultado de la publicación autorizada y las comprobaciones manuales se resumen en `PROGRESS.md`. La publicación usa el despliegue por Git; no modifica base de datos, secretos ni configuración remota.
