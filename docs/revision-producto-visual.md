# Revisión del producto y mejora visual — noviembre de 2026

## Conclusión

El núcleo previsto de NeuroMelody está implementado. Hay adquisición de señal, análisis en Worker, adaptación y síntesis en el navegador, cuenta, sincronización, funcionamiento sin conexión con una sesión de acceso guardada, historial, progreso, informe imprimible, notas, respiración guiada, recordatorios y personalización. La API mantiene su función de identidad, almacenamiento y asistencia del modelo; no participa en la música.

Lo que impide considerar el producto completamente validado es principalmente la falta de evidencia física y con servicios reales. También hay límites de producto que conviene revisar antes de añadir más funciones. Esta revisión es local: no certifica el estado actual de producción ni sustituye una auditoría exhaustiva de seguridad o accesibilidad.

## Qué falta, por prioridad

| Prioridad | Pendiente | Evidencia y consecuencia | Criterio de cierre |
|---|---|---|---|
| Alta | Resolver o delimitar los cortes al bloquear el teléfono y el calentamiento | P-08 sigue abierto en `PROGRESS.md` y `plan-audio-bloqueo.md`. Una prueba con la pestaña visible no reproduce una pantalla bloqueada. | En el Xiaomi, comparar pantalla encendida, bloqueada y desbloqueada, registrar ambas salidas y contrastar los contadores con los cortes escuchados. |
| Alta | Decidir el aislamiento del historial local por cuenta | `createMirroredSessionStore` devuelve `local.list()` y `local.get()` sin filtro. El historial puede borrar todo el almacén local. ADR-53 lo permite expresamente: el dueño protege la sincronización, pero no separa la lectura local. En un dispositivo compartido, otra cuenta puede ver y modificar registros locales ajenos. | Aprobar el cambio de ADR-53 y definir lectura, resumen directo por id, notas, valoraciones y borrados por dueño; probar dos cuentas y datos antiguos sin dueño. No basta con ocultar filas en la pantalla. |
| Alta | Validar cuenta, recuperación, TOTP y sincronización reales | Las pruebas locales usan identidades y API simuladas. La configuración de contraseñas fue comunicada por el usuario; no se comprobó remotamente en esta revisión. | Probar registro, Google, contraseña actual correcta/incorrecta, enlace de recuperación, dos cuentas en un dispositivo y una cuenta en dos dispositivos, también sin red. |
| Media | Recuperación de una sesión ante cierre inesperado | `SessionRecorder` mantiene la sesión activa en memoria; `SessionPage.finishRecording` la guarda al terminar. ADR-52 reconoce que un cierre de la pestaña sin aviso puede perderla. | Definir y aprobar un borrador local recuperable con su dueño, tiempo real escuchado y cierre idempotente. No reanudar audio automáticamente. |
| Media | Continuidad de la personalización entre dispositivos | `SessionRecord` y ADR-48 dejan `context`, `note` y `music` solo en el dispositivo. La sesión descargada de la nube no contiene esos campos. | Decidir qué información debe sincronizarse y con qué consentimiento; acordar contrato, migración y conflictos antes de implementar en ambos repositorios. |
| Media | Hacer descubrible «Tu progreso» desde el inicio | `navigation.ts` solo contiene Inicio, Nueva sesión e Historial. Inicio e Historial enlazan a progreso cuando tienen sesiones. La función ya existe; falta decidir su presencia en la navegación. | Aprobar la ubicación, mantener el acceso móvil compacto y explicar el estado sin datos. |
| Media | Validación física de fuentes y accesibilidad | Cámara experimental; banda real, lector de pantalla, escucha, batería y rendimiento móvil siguen pendientes. El emulador BLE y las señales sintéticas no acreditan la precisión de la cámara. | Comparar cámara con una referencia real, probar banda/reloj, teclado, lector de pantalla, zoom y una sesión prolongada en teléfono. |
| Media | Cierre operativo del reentrenamiento | Existe el flujo `back/.github/workflows/train-model.yml`, pero siguen pendientes los recursos externos y las grabaciones consentidas de al menos cinco personas. No se inspeccionaron secretos ni aprobadores remotos. | Verificar caché de entrenamiento, datos consentidos, evaluación y revisor obligatorio del entorno `model-release`; publicar un modelo solo tras la aprobación humana. |
| Media | Exigir la cobertura del backend en CI | `back/.github/workflows/ci.yml` ejecuta `pip check` y `pytest`, pero no mide ni impone el mínimo de cobertura. La medición histórica manual no evita una regresión futura. | Aprobar un mecanismo reproducible y su umbral, sin añadir dependencias sin autorización. |
| Baja | Unificar la documentación de estado | `plan-entrega.md` y `revision-local.md` contienen estados de octubre; `PROGRESS.md` incluye publicaciones posteriores. P-05 aún enumera A/B como opciones aunque ADR-50/51 ya las resolvieron. | Mantener una sola lista de pendientes vigente y etiquetar las verificaciones antiguas como históricas. |

La migración de `signal_mode` figura como pendiente en la sección del bloque 24. Esta revisión no accedió a Supabase para confirmar si ya fue aplicada. Las dos migraciones de noviembre sí constan como aplicadas por el usuario en el estado más reciente; no deben presentarse como pendientes otra vez.

## Mejora visual implementada

Dirección elegida por el usuario: pulir la identidad actual verde bosque y ámbar. Trabajo local en `feat/visual-polish`, creada desde `dev`; el árbol de `dev` coincidía con `main` al comenzar. El backend solo se revisó y verificó.

Plan de intervención: presentación de RF-11/12/13/15/16/17/18 y RNF-09, dentro de ADR-30/31, sin alterar contratos, rutas, programas musicales, advertencias o autenticación.

| Área | Cambio y motivo |
|---|---|
| Sistema compartido | Sombras más suaves, superficies coherentes, títulos equilibrados, foco también en notas y navegación con selección delimitada. Los valores visuales nuevos viven en `src/index.css`. |
| Inicio | Mejor escala del saludo, separación del acceso rápido, flechas en las intenciones y pasos iniciales más discretos. El orbe decorativo deja de superponerse al texto en pantallas pequeñas. Se ajusta el título ES/EN para no prometer tres pasos cuando el plan tiene cuatro grupos. |
| Preparación | Cuatro grupos numerados, separadores, marca de selección además del color y resumen más legible. La figura decorativa no compite con la duración. En móvil los ambientes ganan espacio. |
| Sesión | Paso actual con superficie propia y detalles desplegados con borde más visible. Se conserva el control de detención y el comportamiento de Esc. |
| Historial y resumen | Listas agrupadas en superficies, semanas con separadores y cifras del resumen con delimitación individual. Los estados vacíos siguen dando un siguiente paso. |
| Progreso y perfil | Filtros agrupados, números alineados y mejor jerarquía de secciones. Se corrigió además el desbordamiento de 29 px del perfil a 320 px, limitando la columna y compactando los selectores de apariencia. Se mantienen las cifras y reglas de comparación originales. |
| Acceso y portada | Formularios con foco sólido visible, borde de tarjeta definido, enlaces de navegación más cómodos y composición de las fuentes de señal más consistente. |

Archivos: `src/index.css`, estilos de `home`, `plan`, `session`, `progress`, `account`, `landing` y preferencias; pequeños cambios de presentación en `HomePage.tsx`, `PlanPage.tsx` y los textos de Inicio ES/EN. Sin dependencias ni recursos remotos nuevos.

## Ideas de funciones nuevas

Son propuestas, no funciones implementadas. Las decisiones que afectan a los ADR se recogen en `propuestas.md`.

| Idea | Valor para la persona | Alcance estimado y límites |
|---|---|---|
| Favoritos con nombre | Guardar «Mi pausa de la tarde» con intención, duración, sonido y ambiente, y volver a ella sin reconfigurar. | Front inicialmente; definir si son locales o por cuenta. Complementa la repetición de la última sesión, que ya existe. |
| Primera sesión acompañada | Explicar la elección de fuente, los tres minutos de referencia, cómo escuchar sin sensor y cuándo no hay datos suficientes. | Front; ampliar la ayuda contextual del recorrido actual, con opción de omitir. No duplicar la aceptación obligatoria de advertencias. |
| Recuperar una sesión interrumpida | Conservar lo escuchado si el sistema cierra la PWA y ofrecer guardar ese tramo al volver. | Persistencia local y estados; requiere diseño y pruebas de cierres y duplicados. No restaurar reproducción ni señal inexistente. |
| Resumen semanal descriptivo | Reunir minutos escuchados, intenciones usadas y valoraciones disponibles, con enlaces a sus sesiones. | Puede calcularse localmente y sin modelo de lenguaje. Sin rachas obligatorias, metas punitivas ni conclusiones clínicas. |
| Copia de seguridad completa | Exportar e importar voluntariamente los registros y campos locales que hoy no viajan a la nube. | Requiere formato versionado, validación, tratamiento de duplicados y aviso claro sobre el contenido personal del archivo. |
| Historial filtrable | Buscar por periodo, intención, fuente o sesiones con nota para encontrar una sesión concreta. | Front; complementa la agrupación semanal actual y debe respetar el aislamiento por cuenta que se acuerde. |

Orden sugerido: primero fiabilidad móvil y aislamiento de datos; después acceso visible a progreso, ayuda inicial y favoritos. Recuperación y sincronización ampliada necesitan acordar su contrato y persistencia. Añadir más modelos o fuentes antes de cerrar la validación actual aumentaría el trabajo pendiente sin resolver las limitaciones principales.

## Evidencia de esta revisión

- Backend: `.venv/Scripts/python -m pytest -q` → **279 aprobadas**.
- Frontend: `node node_modules/vitest/vitest.mjs run` → **844 aprobadas en 110 archivos**. Tras los ajustes finales, repetidas App, acceso e idiomas: **23/23**. Aparecen los avisos conocidos de canvas en jsdom en la batería completa; finaliza con código 0.
- Tipos y lint: `npm run typecheck` y `npm run lint`, invocados con el npm de Node indicado en `AGENTS.md` → código 0.
- Compilación final: Vite → **450 módulos**, paquete principal **338,91 kB / 105,70 kB gzip**. Configuración de identidad/API ficticia, sin llamadas reales.
- Playwright, Chrome: `visual`, `access`, `personalization` e `history` → **16/16**. Incluye 360/768/1280 px, personalización en 390/1280 px, claro/oscuro, ES/EN, teclado, movimiento reducido, detención, carga y errores.
- Revisión adicional: **112 vistas sin desbordamiento ni errores de JavaScript** (14 rutas × 320/390/768/1280 px × claro/oscuro), con identidad simulada. Detectó el desbordamiento del perfil; se corrigió y se repitió la matriz. Foco sólido de 3 px en acceso y selección/foco visibles en colores forzados. El botón de registro queda a y=648 en 1366×657 y 1280×720. Resultados y capturas en `.claude/visual-review/`.
- Tras el último ajuste de texto de Inicio: **6 vistas** adicionales a 320/390/1280 px y en ambos temas, sin desbordamiento ni errores. Capturas finales en `.claude/visual-review-focused/`.
- Sesión: sin desbordamiento a 320×640, 360×740 y 375×667. A 360×740, Conectar termina en y=607, antes de Detener (y=664). En las otras dos alturas requiere un desplazamiento corto; Detener permanece visible. Esto no acredita el comportamiento de audio al bloquear un teléfono.
- `git diff --check` sin errores. No se añadieron pruebas unitarias que repitan los estilos ni dependencias.

No se verificaron audio escuchado, bloqueo físico del teléfono, dispositivos BLE, cámara física, lector de pantalla, cuenta real, envío de correo, Groq real, configuración remota, migraciones remotas ni despliegue. No se ejecutó `test:audio`: el motor y los worklets no cambiaron. La batería seleccionada no equivale a toda la matriz E2E de Chrome y Edge.
