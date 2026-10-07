# Entrega completa — actualización aprobada el 5 de octubre de 2026

El usuario aprobó el plan con ajustes. Solo se implementa S4 en esta conversación. La última decisión retira ONNX del alcance planificado de entrega y establece reglas S4 como alternativa R-05; se declara la limitación de RF-07. El ajuste musical con oyentes el 16 oct sigue como fecha propuesta. No se autorizan dependencias nuevas, push, despliegues ni operaciones remotas. La especificación se conserva. Fuentes: `definicion-proyecto.md`, ADR-08 a ADR-13, `pantallas.md` y `PROGRESS.md`.

## Fecha, capacidad y viabilidad

Desarrollo completo el **12 de noviembre**, entrega el **17 de noviembre**. Trabajo planificado solo de lunes a viernes, excluyendo los festivos colombianos indicados por el usuario: **12 oct, 2 nov y 16 nov**. Entre el 5 oct y el 12 nov quedan **27 días efectivos** (29 entre semana menos dos festivos). La reserva final 13–17 nov contiene únicamente **2 días laborables: viernes 13 y martes 17**. Sábado 14, domingo 15 y festivo 16 no cuentan como jornadas planificadas.

La revisión de S6.2 pasa de 5 a **7 días efectivos**, con todo TOTP y el patrón de login de NeuroMelody dentro del bloque. Se usan los avances reales de S4 para reducir su estimación dentro del calendario de 3 a **1 jornada total el 5 oct**, con una escucha breve del usuario como puerta manual de cierre. No se exige el grupo de oyentes para empezar S5. Al retirar S5.3 ONNX por decisión del usuario, el esfuerzo suma **25 jornadas**: S4 1 + S5 6 + S6 13 + S7 5. **La reserva laborable de desarrollo queda en 2 días: 15 y 16 oct.** El cálculo anterior con ONNX agotaba la reserva; ya no es el calendario vigente.

La entrega con la limitación RF-07 explícita cabe aritméticamente con 2 días de reserva y sigue siendo ajustada. Si S4 ocupa otra jornada, faltan recursos o las incidencias superan dos jornadas, el objetivo del 12 nov queda amenazado. Los fines de semana son reserva adicional opcional, a decisión del usuario; no se presupuestan como trabajo. Los 2 días laborables finales se mantienen para publicación/revisión, no para desarrollar funciones pendientes. Una escucha demorada bloquea el cierre de S4; consume primero la reserva, sin afirmar que la escucha se haya realizado.

Cada jornada es trabajo dedicado con verificación; no se presupone ejecución paralela por agentes. Se informa al terminar cada bloque: un retraso consume reserva; **al agotar las dos jornadas afecta la ruta crítica**, y una dependencia vencida exige revisar el calendario sin recortar más funciones ni activar acceso inseguro.

## Calendario y entregables desplegables

| Sprint / bloque | Fechas de 2026 (solo días hábiles) | Esfuerzo | Requisitos y resultado |
|---|---|---|---|
| S4: RNF-02, lazo y cierre | 5 oct | 1 día, aprovechando implementación existente | RF-02, RF-09, RF-10, RF-12; RNF-02, RNF-03, RNF-11. Histéresis, base, rampas, 1.000 casos, escenario creciente y panel; mediciones desde aceptación/elegibilidad. Pruebas automáticas y una escucha del usuario cierran S4. |
| S5.1: Web Bluetooth | 6–8 oct; comprobación con usuario 13 oct | 3 días | RF-01, RF-03, HU-01, RNF-10. Fuente GATT intercambiable, reconexión 1/2/4/8 s y «Reconectar banda»; adaptadores y parser probados, manual con banda/nRF Connect. La prueba del 13 está incluida en S5.2 y no suma una jornada. |
| S5.2: LF/HF en Worker | 9, 13 y 14 oct | 3 días | RF-06; RNF-04, RNF-05, RNF-11. Interpolación, ventana, PSD y bandas con referencias conocidas, mínimos y calidad visibles. Festivo 12 excluido. |
| Reserva recuperada al retirar S5.3 ONNX | 15–16 oct | **2 días** | Reserva para incidencias/correcciones, no entrenamiento ni integración de modelo. S5 cierra BLE/espectro el 14 oct con R-05. Propuesta: ajuste con 3–5 oyentes el 16 oct, commit pequeño separado; si consume trabajo de esta reserva se registra su consumo real. |
| S6.1: sesiones locales e historial | 19–21 oct | 3 días | RF-14, RF-15, RF-16; HU-07, HU-08, HU-10; RNF-07. Registro, plan manual editable, resumen de indicadores y descarga, historial/evolución y borrado local. |
| S6.2: correo, TOTP completo, API y sincronización | 22–23 y 26–30 oct | **7 días** | RF-14; RNF-07, RNF-12; ADR-10. NeuroMelody implementa el patrón compartido de login y lo documenta en `docs/autenticacion.md`: correo/contraseña, confirmación/recuperación; consentimiento; TOTP alta/verificación/recuperación y dos dispositivos; JWT, migraciones/RLS/aal2, UUID v7, idempotencia, propiedad y borrado de sesiones/cuenta. Sincronización solo tras aal2. |
| S6.3: Google y cierre | 3 nov | 1 día | RF-14; ADR-10. Google/redirecciones y enlace del recorrido con TOTP ya terminado; revisión integrada. Festivo 2 nov excluido. No queda TOTP pendiente para este bloque. |
| S6.4: Groq | 4–5 nov | 2 días | RF-13, RF-15; HU-07, HU-08; ADR-05 y ADR-08. FastAPI, salida de esquema cerrado, métricas agregadas/consentimiento, etiquetas automáticas, reintento/caché/límites, plan por defecto y resumen diferido. |
| S7.1: cierre offline | 6 y 9 nov | 2 días | RF-14, HU-09, RNF-08. PWA y sesión completa sin red, modelo o alternativa, cola persistente y reenvío sin duplicados con aal2. |
| S7.2: AA y rendimiento | 10–11 nov | 2 días | RF-11, RF-12, RF-17, RF-18; RNF-01 a RNF-06, RNF-09, RNF-10. Lector/zoom/teclado/contraste, tareas <50 ms, consumo ≤35 % de un núcleo, 30 min de audio, navegadores objetivo. |
| S7.3: congelación y documentos | 12 nov | 1 día | RF-01 a RF-18 y HU-01 a HU-10. Matriz verificable, tipos/lint/build, cliente/servidor, E2E Chrome/Edge, manuales, privacidad, operación y demo. |
| Publicación y entrega | 13 y 17 nov | 2 días efectivos, dentro de 13–17 nov | Configuración/aprobación y push del usuario, preview/producción, cabeceras, SMTP/OAuth/Groq, smoke y correcciones. 14–15 fin de semana y 16 festivo no planificados. |

**S6.2, estimación revisada de 7 días:** 1 día correo/confirmación/recuperación y consentimiento; 2 días TOTP (alta, desafío, recuperación y dos dispositivos); 2 días API/JWT, migraciones/RLS/aal2/propiedad y borrado; 2 días sincronización UUID v7/idempotencia, pruebas de integración y `docs/autenticacion.md`. NeuroMelody desarrolla y documenta el patrón reutilizable, sin dependencia de otro proyecto. Los casos de recuperación respetan la negativa de acceso a salud sin aal2; cualquier ambigüedad del proveedor se resuelve antes de programar, sin inventar bypass/endpoints. Presupone SMTP y Supabase listos; la recuperación y RLS son el mayor riesgo de la estimación y pueden consumir reserva.

S5 entrega BLE/espectro con el estimador R-05 visible; S6 entrega recorridos locales/remotos, TOTP/Google y Groq completos; S7 entrega evidencia final. No se declara RF-07 ONNX cumplido. Desplegable exige build/pruebas correctos; publicación exige aprobación y recursos y no se infiere del preview local.

**Ruta crítica:** cierre S4 → BLE/espectro → sesión local/esquema → correo/TOTP/API/RLS/aal2 → sincronización idempotente → offline → validación → publicación. No incluye ONNX ni una rama de entrenamiento. Google y texto Groq se terminan después del recorrido principal; TOTP se adelanta por aal2 y jamás se pospone abriendo salud con un solo factor.

## Interpretación RNF-02 aprobada

Se registran siempre ambos intervalos: `programación − aceptación tras histéresis` y `programación − elegibilidad`.

- Retroceso Alta: elegibilidad = aceptación; sin permanencia; se exige <2 s en ambos intervalos.
- Avance Baja o Incierta: elegibilidad = el máximo entre final de permanencia (inicio de última transición +180 s) y momento en que ya hay estado aceptado, calidad buena y tres estimaciones recientes sin Alta. Se exige <2 s desde elegibilidad; el intervalo desde aceptación puede superar 2 s por la espera obligatoria y se conserva en la evidencia.
- La interfaz indica «Se conserva el escalón hasta completar su duración mínima de 3 minutos». Las notificaciones de fuente permiten revisar el reloj de audio entre publicaciones de índices de 5 s; no cuentan como estimaciones ni evitan la histéresis. Las rampas siguen automatizadas en AudioParam, sin temporizadores musicales nuevos.
- Pérdida de contacto/hueco o un resultado nuevo desfavorable cancela elegibilidad; no se ejecuta una decisión obsoleta. Las pruebas registran ambas mediciones y el retraso de control real; no se afirma latencia acústica ni que el fundido de modo empiece antes del cierre del ciclo.

No se modifica `definicion-proyecto.md`; es una interpretación explícita autorizada y registrada en ADR-12.

## Entrenamiento no iniciado y RF-07 limitado

Comprobaciones del 5 oct, solo lectura: `git branch -a` sin rama de entrenamiento; `git reflog --all -200` contiene 120 entradas, ninguna con «clasificador»; `git log --all --oneline -- scripts/clasificador` vacío; `scripts/clasificador/` no existe; búsqueda recursiva de `.onnx` en la carpeta del proyecto sin resultados. Tampoco se hallaron scripts, etiquetas o datasets de entrenamiento en los archivos propios del repositorio. `git ls-remote` previo tampoco encontró esa rama. No se hizo fetch, recuperación ni integración de artefactos.

Por decisión del usuario se trata el entrenamiento como **inexistente/no iniciado**: no hay conjunto etiquetado de entrenamiento, etiquetas ni ONNX. Los extractos RR nsr2db existentes son fuentes de prueba de señal; no se les asignan etiquetas de activación ni se convierten en verdad de entrenamiento. El clasificador de entrega es el estimador por reglas S4 (R-05), con confianza no calibrada. **RF-07 queda limitado: no se entrega el clasificador entrenado/ONNX descrito en la especificación.** Se declara esa limitación, sin modificar la especificación ni citar una rama pendiente como dependencia.

### Mejora ONNX opcional al final — propuesta relativa, sin ejecución autorizada

Solo si sobra tiempo después de completar la entrega obligatoria y con aprobación específica: el usuario define primero el contrato de etiquetas (nombres, significado, fuente y asignación por persona/ventana). No se elige dataset ni se inicia entrenamiento por iniciativa del agente. La comparación siguiente queda como propuesta para esa mejora, no como puerta del calendario ni como requisito para cerrar S5.

En un conjunto congelado de validación con **personas distintas** de entrenamiento/ajuste, ejecutar ONNX y reglas S4 sobre las mismas ventanas etiquetadas, el mismo filtrado y la misma base de sesión. No ajustar modelo, umbrales ni normalización con ese conjunto. Evaluar las estimaciones antes de la histéresis, para que ambas alternativas tengan la misma unidad de comparación.

- Exactitud global ONNX ≥ exactitud global reglas S4: aciertos / total de ventanas comunes con etiqueta de referencia.
- Sin empeorar por clase: **recall** ONNX ≥ recall reglas S4 para cada clase de referencia, usando la misma matriz (aciertos de la clase / ventanas realmente de esa clase). Publicar también precisión, soporte, resultados por persona y matrices completas; no ocultar una clase con un promedio.
- Incierta es abstención si la verdad tiene solo Alta/Baja: cuenta como fallo para esa ventana en ambos sistemas, sin excluir ventanas difíciles. Si el entrenamiento usa una tercera clase real, su definición y fuente deben confirmarse antes de acordar el mapa; no inventar etiquetas Incierta.
- Reglas de exclusión por datos insuficientes/calidad se fijan para ambos antes de evaluar; informar cuántas ventanas se excluyen. Debe haber soporte de todas las clases acordadas. Sin procedencia de etiquetas o sin soporte, no hay evidencia para habilitar ONNX.
- Pasar este criterio es una comparación de ingeniería, no validación clínica. Se requiere además equivalencia de vectores del exportador y del navegador, caché offline y regresión en CI. Si falta artefacto/evidencia o empeora cualquier clase, mantener R-05 y continuar el resto del calendario.

No hay fecha de entrega ONNX ni solicitud de etiquetas para el 9/14/16 oct. La aprobación de la entrega no autoriza esta mejora. Si se encuentran artefactos posteriormente, se comunica exactamente qué son y no se integran sin aprobación.

La eventual dependencia `onnxruntime-web` se justifica por la ejecución ONNX en Worker prevista en la arquitectura; se solicitará aprobación de versión/tamaño antes de instalarla. La alternativa sin dependencia es mantener las reglas de S4. Para servidor y autenticación se propondrán las bibliotecas del stack antes de instalarlas; no hay autorización implícita para instalar SDK, CLI, axe-core ni paquetes Python nuevos.

## BLE y comprobación manual

Primera comprobación el **13 de octubre**, usando banda con RR o un Android con nRF Connect configurado como periférico estándar de ritmo cardíaco. Fecha tope **16 de octubre** para emparejar, recibir RR, desconectar, reconectar y recargar en Chrome/Edge de escritorio y Chrome/Edge Android cuando el dispositivo lo permita. El simulador y nsr2db siguen siendo la evidencia automática hasta entonces. La emulación no prueba la compatibilidad ni precisión de una banda real; registrar esa limitación.

La configuración exacta, UUID, flags, ejemplos de RR y captura de bytes están en `docs/prueba-ble.md`, contrastada con Bluetooth SIG y Nordic. Si el parser difiere, guardar bytes anonimizados, fijar regresión y repetir adquisición → índices → adaptación. Usar la reserva 15–16 oct según consumo real; no modificar contrato ni declarar HU-01 cumplida si falla. Segunda comprobación antes del **6 nov** para regresiones.

## Funciones pendientes en la interfaz (propuesta)

Hasta estar activas, rutas del mapa con página informativa accesible, motivo y regreso al inicio/sesión. Acción pendiente deshabilitada con explicación visible y fecha prevista; nunca un enlace a una ruta inexistente ni un botón que aparente éxito. Google: mantener disponible el correo. TOTP pendiente: permitir escuchar/ver historial local, bloquear lectura y sincronización remotas explicando el segundo factor. Groq pendiente o sin red: plan manual y resumen de indicadores; distinguir «Resumen automático pendiente» de un texto generado. En producción de entrega estas funciones deben estar activas y verificadas; no se consideran terminadas con una etiqueta de pendiente. La propuesta se recoge en `pantallas.md`, sin construir pantallas S6 en S4.

## Recursos del usuario y fechas

| Recurso / decisión | Fecha necesaria | Uso |
|---|---|---|
| Una escucha del usuario: inicio, volumen moderado, fundidos y stop | Cierre S4, previsto 5 oct | Única puerta manual de S4. RNF-02 y calendario ya aprobados. |
| 3–5 oyentes y resultados para levels.ts | Propuesto 16 oct, después del cierre técnico S5 | Ajuste posterior en commit pequeño separado; no bloquea S4, se registra consumo de reserva. |
| Android/nRF Connect o banda BLE con RR, navegadores | Preparado 8 oct; prueba 13 oct, tope 16 oct | HU-01/reconexión. Configuración exacta en prueba-ble.md. |
| Contrato de etiquetas ONNX | Sin fecha obligatoria | Solo si se aprueba mejora opcional al final y sobra tiempo. No es dependencia de entrega. |
| Proyecto Supabase Free propio us-east-1, URL/configuración | Preparado 19 oct; disponible 21 oct | S6.2 empieza 22 oct. Secretos solo en entorno, nunca chat/repo. |
| SMTP Gmail con contraseña de aplicación configurada | 21 oct | Correo real/confirmación/recuperación desde 22 oct. |
| Google OAuth y redirecciones preview/producción | 30 oct | Google/cierre el 3 nov; el 2 nov es festivo. |
| Clave propia Groq y retención cero confirmada | 3 nov | Plan/resumen 4–5 nov, clave solo servidor. |
| Autenticador y disponibilidad de dos dispositivos TOTP | 22 oct | Flujo completo dentro de S6.2, recuperación/aal2/acceso denegado. |
| Equipo de gama media identificado; lector de pantalla y zoom; navegadores Android | 6 nov | Consumo, rendimiento, AA y RNF-10 en S7. |
| Aprobación expresa de operaciones remotas, Vercel/GitHub conectados y variables configuradas | Preparado 6 nov; ejecución 13 nov | Publicación por push del usuario, migraciones autorizadas, comprobaciones reales antes del 17. |

Los límites actuales de servicios gratuitos se contrastarán con documentación oficial antes de tomar decisiones de infraestructura en S6; no se crean cuentas con tarjeta ni planes de pago. Las operaciones remotas necesitan aprobación en ese momento, incluso si se aprueba este calendario.

## Definición de terminado por historia

Estado al preparar el plan, con evidencia de S3 y verificación S4; ninguna comprobación pendiente se supone realizada.

| HU | Evidencia exigida para declarar terminado | Estado actual / cierre previsto |
|---|---|---|
| HU-01 | Manual con periférico: emparejar <15 s, estado visible; pruebas GATT/reintentos y recarga; matriz escritorio/Android | S5 (6 oct): fuente GATT, reintentos 1/2/4/8 s y «Reconectar banda» con pruebas sobre GATT simulado. Falta la prueba manual con periférico del 13 oct; no se declara cumplida. |
| HU-02 | ≥3 escenarios reproducibles y velocidades; cadena idéntica detrás de SignalSource para simulador/registro/BLE | Simulador/registro verificados; BLE implementa el mismo SignalSource (S5, 6 oct). Pendiente la cadena con periférico real. |
| HU-03 | Inicio medido <1 s en producción/preview con equipo documentado; 30 min nativos con 0 subdesbordamientos, repetir con lazo final | S3: 30 min reales con 0. Inicio extremo a extremo <1 s no está medido; revalidación S7. |
| HU-04 | 1.000 transiciones; tempo y modo ≥20 s, reversión sin saltos, E2E y una escucha del usuario | S4 cerrado el 5 oct: pruebas automáticas y escucha completa confirmada por el usuario, todo pasó. Grupo de oyentes posterior, propuesto 16 oct. |
| HU-05 | Índices/estado cada ≤5 s de señal; texto accesible y gráfica; tareas largas y comprobación visual | S2/S4: índices y estado. Rendimiento y percepción manual finales S7. |
| HU-06 | Botón visible en todos los tamaños, teclado/Esc, muestras silenciadas <200 ms y comprobación manual | S3: rampa de 50 ms, pruebas y E2E. Lector, zoom y dispositivo manual pendientes S7. |
| HU-07 | Plan visible antes de escuchar, objetivos/duración editables; propuesta válida del modelo y alternativa manual sin red | Plan manual S3 parcial: comprobar objetivos además de duración en S6; Groq pendiente S6. |
| HU-08 | Resumen local con indicadores, descarga, texto llano marcado automáticamente; error/red no rompen el recorrido | Pendiente S6; completar Groq y diferido S7. |
| HU-09 | PWA sin red durante sesión completa, fuente/estimador R-05/audio; volver la red con sincronización sin duplicados y aal2 | S3/S4: shell, registro, reglas y audio offline. Persistencia/cola pendientes S6–S7. ONNX no es dependencia de entrega. |
| HU-10 | Historial local/nube con evolución; propiedad/aal2, borrado efectivo e historial sin cuenta | Pendiente S6 y E2E S7. |

Terminación global: RF restantes y las diez HU verificadas; excepción explícita RF-07 por decisión del usuario, entrega con reglas R-05 y sin clasificador entrenado. Ninguna otra función se elimina. Tipos/lint/build, cliente/servidor, cobertura ≥70 %, E2E Chrome/Edge, 30 min audio, AA, RNF-04/RNF-05, privacidad/borrado, costo cero, secretos fuera del cliente y recorridos comprobados en remoto. Un fallo obligatorio o comprobación manual ausente impide declarar terminado ese criterio.

## Matriz de requisitos de entrega (estado 5 oct)

| RF | Estado verificable y cierre previsto |
|---|---|
| RF-01 | S5 (6 oct): descubrimiento, emparejamiento y reconexión implementados con pruebas automáticas; falta la comprobación con periférico del 13 oct. |
| RF-02 | Simulador verificado: cinco escenarios, semillas y velocidades. |
| RF-03 | Parser y recepción vía `characteristicvaluechanged` verificados con GATT simulado; falta la recepción real del 13 oct. |
| RF-04 | Filtro/calidad verificados con vectores y artefactos. |
| RF-05 | Índices temporales/ventana verificados en Worker. |
| RF-06 | S5 (6 oct): PSD (spline 4 Hz, Hann, FFT) y LF/HF en el Worker, contrastados con senoides de potencia conocida. |
| RF-07 | **Limitado por decisión del usuario:** estimador por reglas S4, alternativa R-05, sin confianza calibrada. No hay entrenamiento, etiquetas ni ONNX; requisito literal del clasificador entrenado no cumplido. ONNX opcional, sin dependencia de una rama. |
| RF-08 | Síntesis por capas verificada; escucha completa confirmada por el usuario el 5 oct. |
| RF-09 | Lazo/rampas/estado provisional verificados S4; escucha confirmada el 5 oct. |
| RF-10 | 1.000 transiciones de tempo y 1.000 fundidos de modo verificados; escucha confirmada el 5 oct. |
| RF-11 | Reproducción/volumen/stop y Esc verificados; comprobaciones manuales de sistema/AA pendientes. |
| RF-12 | Señal/índices/estado/confianza descriptiva verificados; LF, HF y LF/HF visibles desde S5. |
| RF-13 | Propuesta de plan por modelo pendiente S6.4; plan manual existente. |
| RF-14 | Sesiones locales, nube, consentimiento, RLS/aal2 y sincronización pendientes S6/S7; migración inicial solo comprobada estáticamente. |
| RF-15 | Resumen de indicadores/descarga S6.1; texto Groq S6.4. |
| RF-16 | Historial/evolución/borrado pendientes S6.1/S6.2. |
| RF-17 | Advertencias y aceptación previa verificadas. |
| RF-18 | Límite digital/volumen y advertencia de duración verificados; nivel acústico/dispositivo requieren revisión manual. |

## Riesgos y alertas tempranas

| Sprint | Riesgo concreto | Detección y respuesta |
|---|---|---|
| S4 | Música desagradable o fuente retrasada | Cerrado el 5 oct: RNF-02 probado y escucha completa confirmada por el usuario, todo pasó. Grupo de oyentes posterior. |
| S5 | No hay periférico o espectro sin referencia | Conexión el 13 oct, espectro el 14; correcciones usan reserva 15–16. Sin periférico HU-01 sigue manual pendiente. No se espera entrenamiento. |
| S6 | Correo/recuperación TOTP/RLS/aal2 o duplicados bloquean sincronización | Recursos 21–22 oct, correo 22, TOTP completo 26, negativas RLS/aal2 28, idempotencia 30. NeuroMelody documenta patrón en autenticacion.md; nube bloqueada sin aal2. |
| S7 | Rendimiento/audio móvil, AA o actualización PWA falla; despliegue difiere del preview | Ensayo de 30 min y muestra de accesibilidad antes del 10 nov, repetir red/colas el 9. Congelar el 12; fallos graves se corrigen antes de presentar. |
| Entrega | Variables/cabeceras/proveedor no funcionan en remoto | Recursos listos 6 nov; preview/producción 13 nov y revisión final 17 nov. El 16 es festivo. Sin autorización/credenciales no se afirma publicación exitosa. |

No se reduce el alcance por iniciativa del agente. Si se agota la reserva, el usuario decide la reorganización y se informa el incumplimiento previsto antes del plazo.
