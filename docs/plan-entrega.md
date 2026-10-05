# Propuesta de entrega completa — 5 de octubre de 2026

**Pendiente de aprobación del usuario.** Esta conversación implementa solamente S4. Este plan no autoriza otros sprints, nuevas dependencias, push, despliegue ni operaciones en servicios remotos. La especificación no se modifica. Referencias: `definicion-proyecto.md`, `decisiones.md` (incluidos ADR-08, ADR-09 y ADR-10), `pantallas.md` y `PROGRESS.md`.

## Fecha y viabilidad

Desarrollo completo el **12 de noviembre**. Del **13 al 17 de noviembre**, despliegue, comprobaciones manuales, correcciones y ensayo de entrega. El plazo externo es el **17 de noviembre**; el cronograma original que llegaba al 19 queda sustituido por la propuesta de ADR-13.

Hay 29 días de lunes a viernes entre el 5 de octubre y el 12 de noviembre, sin descontar festivos ni otros compromisos. Se estiman **27 días efectivos** de trabajo dedicado, más **2 días de reserva dentro del desarrollo**. Es viable con dedicación continua y recursos disponibles a tiempo; el margen es pequeño. El mayor riesgo es integrar autenticación, TOTP, RLS y sincronización con credenciales e infraestructura aún ausentes. Si esos recursos llegan tarde o la verificación BLE exige rehacer adquisición, el alcance completo puede no caber. Las reglas de S4 evitan que el entrenamiento bloquee la entrega, pero no sustituyen TOTP ni autorizan acceso inseguro a la nube.

Un día efectivo es una jornada de desarrollo y verificación; las fechas son ventanas de calendario, no una promesa de trabajo simultáneo de varios agentes. Cada sprint se ejecuta en su conversación y rama propias, con plan aprobado y commits locales. Se revisan avance y desvíos al final de cada bloque: más de un día de retraso consume reserva; dos días o una dependencia vencida requieren revisar el calendario con el usuario sin recortar funciones.

## Calendario propuesto y entregables desplegables

| Sprint / bloque, en orden de riesgo | Fechas de 2026 | Esfuerzo | Requisitos y entregable verificable |
|---|---|---|---|
| S4: lazo y evaluación musical | 5–8 oct | 3 días | RF-02, RF-09, RF-10, RF-12; RNF-02, RNF-03, RNF-11. Reglas aprobadas, histéresis, reversión y rampas, panel musical, escenario creciente, pruebas de 1.000 transiciones y E2E. Ajuste con 3–5 oyentes. |
| S5.1: Web Bluetooth | 9–13 oct | 3 días | RF-01, RF-03; HU-01; RNF-10. Fuente intercambiable, conexión por interacción, parser, desconexión, reintentos a 1/2/4/8 s y «Reconectar banda» tras recargar. Adaptadores GATT simulados y verificación manual en navegador. |
| S5.2: espectro | 14–16 oct | 3 días | RF-06; RNF-04, RNF-05. Interpolación, ventana, PSD e integración LF/HF en Worker con referencias conocidas; mínimos de señal y mala calidad visibles, sin cifras inventadas. |
| S5.3: ONNX / alternativa | 17–20 oct | 2 días | RF-07; RNF-08, RNF-11; ADR-09 y R-05. Integración del artefacto si pasa el criterio acordado; de lo contrario mantener las reglas provisionales, documentar RF-07 como alternativa y conservar prevista la integración ONNX. Modelo público versionado con huella y caché, inferencia fuera del hilo principal. |
| S6.1: sesiones locales, historial y resumen de indicadores | 21–23 oct | 3 días | RF-14, RF-15, RF-16; HU-07, HU-08, HU-10; RNF-07. Registro local de sesión completa, plan editable, resumen local descargable, evolución e historial y borrado. Sincronicidad e identidad de sesión preparadas sin activar acceso remoto. |
| S6.2: correo, API, seguridad y sincronización | 26–30 oct | 5 días | RF-14; RNF-07, RNF-12; ADR-10. Supabase, correo/contraseña, confirmación/recuperación, consentimiento, JWT, migraciones locales y pruebas de RLS/propiedad/aal2, UUID v7 e idempotencia, lectura/borrado de sesiones y cuenta, dos dispositivos TOTP. Sin sincronización antes de pasar el segundo factor. |
| S6.3: proveedor Google y completar recorrido TOTP | 2 nov | 1 día | RF-14; ADR-10. Google por redirección, alta/verificación/recuperación del segundo factor en el alcance acordado, integración entre cuentas y sesión local. El mecanismo de aal2 y su negativa de acceso se construyen en S6.2; si la interfaz TOTP sigue pendiente, la nube permanece bloqueada. |
| S6.4: plan y resumen con Groq | 3–4 nov | 2 días | RF-13, RF-15; HU-07, HU-08; ADR-05 y ADR-08. FastAPI valida salida de esquema cerrado; agregados y consentimiento, etiqueta automática, límites y reintento/caché, plan por defecto y resumen diferido sin red. El modelo nunca entra al lazo. |
| Reserva de desarrollo | 8 oct y 5 nov | 2 días | Absorber incidencias de hardware, RLS y servicios. No añadir alcance. |
| S7.1: cierre sin conexión y sincronización | 6–9 nov | 2 días | RF-14; HU-09; RNF-08. App, señal, clasificador o alternativa y audio sin red; cola persistente, reenvío autorizado sin duplicados al volver la red, errores recuperables y actualización segura de PWA. |
| S7.2: accesibilidad y rendimiento | 10–11 nov | 2 días | RF-11, RF-12, RF-17, RF-18; RNF-01 a RNF-06, RNF-09, RNF-10. Auditoría AA, teclado/lector/zoom/contraste, tareas >50 ms, consumo <35 % de un núcleo medido en equipo documentado; 30 min de audio y BLE en plataformas objetivo. |
| S7.3: documentación y congelación | 12 nov | 1 día | RF-01 a RF-18 y HU-01 a HU-10. Matriz completa, comandos reproducibles, pruebas de API y cliente, build, E2E Chrome/Edge, manuales, privacidad, operación gratuita y demo. No quedan funciones previstas sin implementar. |
| Entrega y despliegue | 13–17 nov | Reserva final de 5 días de calendario | Push e integración por el usuario, configuración remota y migraciones solo con aprobación expresa en ese momento; preview/producción, cabeceras, SMTP/OAuth/Groq, pruebas manuales, correcciones y presentación. |

S5 cierra con una versión utilizable con BLE y simulador, espectro y ONNX aprobado o alternativa visible. S6 cierra con los recorridos locales y de nube completos, TOTP, Google y modelo de lenguaje. S7 cierra con evidencia y operación documentadas. «Desplegable» exige build y pruebas sin fallos; publicar requiere autorización y recursos, y no se da por verificado desde el preview local.

**Ruta crítica:** BLE/espectro → sesión local y su esquema → API/JWT/RLS/TOTP → sincronización idempotente → recorrido sin conexión → pruebas completas → aprobación y despliegue. La entrega del ONNX tiene una salida por R-05. SMTP, Supabase y configuración OAuth sí pueden bloquear recorridos obligatorios. El trabajo tardío de menor impacto es terminar Google, el recorrido TOTP y el texto de Groq; permanece planificado. Nunca se sustituye la obligación de aal2 por autenticación de un solo factor para ganar tiempo.

## Contrato pendiente con entrenamiento

La rama `entrenamiento-clasificador` no aparece en las referencias locales consultadas el 5 de octubre; no se hizo fetch ni se contactó otro agente. El usuario deberá facilitar su ubicación o artefactos. Para el **9 de octubre** se necesita: orden/unidades de rasgos, definición exacta de normalización relativa a la base, manejo de índices ausentes, clases y regla de Incierta, entradas/salidas y versiones de exportación. No inventar LF/HF, tasas de remuestreo o umbral de confianza.

Para el **14 de octubre**: ONNX, licencia/procedencia, huella SHA-256, tamaño, vectores de referencia y salidas esperadas, evaluación por persona sin filtración entre entrenamiento y validación, exactitud y matriz de confusión reproducibles. La exactitud mínima «acordada» no está fijada numéricamente en los documentos consultados; se requiere la decisión del usuario antes de habilitar el modelo. No se propone una cifra sin conocer la validación.

Puerta de integración el **16 de octubre**: artefacto disponible, contrato compatible y criterio aprobado satisfecho. Si falla, S5 cierra con las reglas de S4 como alternativa R-05, rotuladas con confianza no calibrada; no se declara ONNX integrado ni validado. Integrarlo más tarde consume la reserva, con pruebas de regresión; no retrasa sesiones, autenticación o sincronización.

La eventual dependencia `onnxruntime-web` se justifica por la ejecución ONNX en Worker prevista en la arquitectura; se solicitará aprobación de versión/tamaño antes de instalarla. La alternativa sin dependencia es mantener las reglas de S4. Para servidor y autenticación se propondrán las bibliotecas del stack antes de instalarlas; no hay autorización implícita para instalar SDK, CLI, axe-core ni paquetes Python nuevos.

## BLE y comprobación manual

Primera comprobación el **13 de octubre**, usando banda con RR o un Android con nRF Connect configurado como periférico estándar de ritmo cardíaco. Fecha tope **16 de octubre** para emparejar, recibir RR, desconectar, reconectar y recargar en Chrome/Edge de escritorio y Chrome/Edge Android cuando el dispositivo lo permita. El simulador y nsr2db siguen siendo la evidencia automática hasta entonces. La emulación no prueba la compatibilidad ni precisión de una banda real; registrar esa limitación.

Si aparecen diferencias del parser: guardar vectores de bytes anonimizados, fijar pruebas de regresión, corregir el parser manteniendo el contrato de fuente y repetir adquisición → índices → adaptación. Se reserva hasta un día de S5 o la reserva del 5 de noviembre. Si afecta el contrato o supera ese esfuerzo, se consulta y replantea el calendario; no se improvisan campos ni se declara HU-01 cumplida. Una segunda comprobación antes del **6 de noviembre** detecta regresiones antes del cierre.

## Funciones pendientes en la interfaz (propuesta)

Hasta estar activas, rutas del mapa con página informativa accesible, motivo y regreso al inicio/sesión. Acción pendiente deshabilitada con explicación visible y fecha prevista; nunca un enlace a una ruta inexistente ni un botón que aparente éxito. Google: mantener disponible el correo. TOTP pendiente: permitir escuchar/ver historial local, bloquear lectura y sincronización remotas explicando el segundo factor. Groq pendiente o sin red: plan manual y resumen de indicadores; distinguir «Resumen automático pendiente» de un texto generado. En producción de entrega estas funciones deben estar activas y verificadas; no se consideran terminadas con una etiqueta de pendiente. La propuesta se recoge en `pantallas.md`, sin construir pantallas S6 en S4.

## Recursos del usuario y fechas

| Recurso / decisión | Fecha necesaria | Uso |
|---|---|---|
| Aprobar esta propuesta y resolver la latencia de avance frente a la permanencia | Cierre de S4, previsto 8 oct | Fijar calendario, prioridades y criterio RNF-02 sin contradicción. |
| 3–5 oyentes y resultados de escucha (volumen moderado, inicio, fundidos, timbre, stop) | 8 oct | Cerrar la evaluación musical de S4; ajustar tabla solo con resultados. |
| Android/nRF Connect o banda BLE con RR, y navegadores disponibles | Preparado 9 oct; prueba 13 oct, tope 16 oct | Verificar HU-01 y compatibilidad/reconexión reales. |
| Ubicación y contrato de la rama de entrenamiento; umbral de exactitud y entrega ONNX | 9 oct / 14 oct / decisión 16 oct | Evitar integrar un clasificador incompatible o sin evidencia. |
| Proyecto Supabase Free propio en us-east-1, URL y configuración de acceso | Preparado 20 oct; disponible 23 oct | Migraciones y autenticación/sincronización. Secretos solo en entorno, no en chat ni archivos versionados. |
| SMTP de Gmail y contraseña de aplicación configurada por el usuario | 23 oct | Confirmación, recuperación y prueba de correos reales. |
| Configuración Google OAuth y URLs de redirección de preview/producción | 29 oct | Completar Google entre 30 oct y 2 nov. |
| Clave propia Groq y confirmación de retención cero en Data Controls | 30 oct | Plan/resumen desde servidor el 3–4 nov; no exponer clave al cliente. |
| Teléfono con autenticador y disponibilidad para dos dispositivos TOTP | 26 oct | Alta/verificación/aal2, acceso denegado y prueba de sincronización. |
| Equipo de gama media identificado; lector de pantalla y zoom; navegadores Android | 6 nov | Consumo, rendimiento, AA y RNF-10 en S7. |
| Aprobación expresa de operaciones remotas, Vercel/GitHub conectados y variables configuradas | Preparado 6 nov; ejecución 13 nov | Publicación por push del usuario, migraciones autorizadas, comprobaciones reales antes del 17. |

Los límites actuales de servicios gratuitos se contrastarán con documentación oficial antes de tomar decisiones de infraestructura en S6; no se crean cuentas con tarjeta ni planes de pago. Las operaciones remotas necesitan aprobación en ese momento, incluso si se aprueba este calendario.

## Definición de terminado por historia

Estado al preparar el plan, con evidencia de S3 y verificación S4; ninguna comprobación pendiente se supone realizada.

| HU | Evidencia exigida para declarar terminado | Estado actual / cierre previsto |
|---|---|---|
| HU-01 | Manual con periférico: emparejar <15 s, estado visible; pruebas GATT/reintentos y recarga; matriz escritorio/Android | Pendiente S5. Parser unitario existente; no hay banda verificada. |
| HU-02 | ≥3 escenarios reproducibles y velocidades; cadena idéntica detrás de SignalSource para simulador/registro/BLE | Simulador/registro verificados; completar sustitución BLE S5. |
| HU-03 | Inicio medido <1 s en producción/preview con equipo documentado; 30 min nativos con 0 subdesbordamientos, repetir con lazo final | S3: 30 min reales con 0. Inicio extremo a extremo <1 s no está medido; revalidación S7. |
| HU-04 | 1.000 transiciones; tempo y modo ≥20 s, reversión sin saltos, E2E y escucha 3–5 oyentes | S4: pruebas automáticas; evaluación auditiva pendiente. |
| HU-05 | Índices/estado cada ≤5 s de señal; texto accesible y gráfica; tareas largas y comprobación visual | S2/S4: índices y estado. Rendimiento y percepción manual finales S7. |
| HU-06 | Botón visible en todos los tamaños, teclado/Esc, muestras silenciadas <200 ms y comprobación manual | S3: rampa de 50 ms, pruebas y E2E. Lector, zoom y dispositivo manual pendientes S7. |
| HU-07 | Plan visible antes de escuchar, objetivos/duración editables; propuesta válida del modelo y alternativa manual sin red | Plan manual S3 parcial: comprobar objetivos además de duración en S6; Groq pendiente S6. |
| HU-08 | Resumen local con indicadores, descarga, texto llano marcado automáticamente; error/red no rompen el recorrido | Pendiente S6; completar Groq y diferido S7. |
| HU-09 | PWA sin red durante sesión completa, fuente/modelo/audio; volver la red con sincronización sin duplicados y aal2 | S3: shell, registro y audio offline. Persistencia/cola/clasificador pendientes S5–S7. |
| HU-10 | Historial local/nube con evolución; propiedad/aal2, borrado efectivo e historial sin cuenta | Pendiente S6 y E2E S7. |

Terminación global: todos RF-01 a RF-18 abordados (incluidos los de prioridad Media), las diez historias verificadas o con limitación externa explícita que el usuario debe resolver; tipos/lint/build y pruebas cliente/servidor sin fallos, cobertura ≥70 % requerida, E2E Chrome/Edge, 30 min de audio, auditoría AA y mediciones RNF-04/RNF-05, privacidad y eliminación, costo cero, secretos fuera del cliente, cabeceras y recorridos comprobados en despliegue real. Un fallo obligatorio impide declarar la app completa.

## Riesgos y alertas tempranas

| Sprint | Riesgo concreto | Detección y respuesta |
|---|---|---|
| S4 | Música desagradable; criterios de latencia y permanencia en conflicto | Escucha antes del 8 oct; decisión explícita sobre RNF-02. No cerrar la evaluación sin oyentes. |
| S5 | No hay periférico; espectro sin referencia; ONNX incompatible o sin umbral | Conexión el 13 oct, vectores espectrales antes del 16, puerta ONNX el 16. Si no hay modelo, R-05; si no hay periférico, HU-01 queda pendiente manual. |
| S6 | SMTP/OAuth/aal2 o RLS bloquean sincronización; conflictos/duplicados offline | Correo real el 23–26 oct, pruebas de negativa RLS/aal2 el 27, reenvío idempotente antes del 30. Recursos atrasados >1 día consumen reserva; nube sigue bloqueada sin aal2. |
| S7 | Rendimiento/audio móvil, AA o actualización PWA falla; despliegue difiere del preview | Ensayo de 30 min y muestra de accesibilidad antes del 10 nov, repetir red/colas el 9. Congelar el 12; fallos graves se corrigen antes de presentar. |
| Entrega | Variables, cabeceras o proveedor gratuito no funcionan en remoto | Recursos listos 6 nov; smoke de preview 13 nov y producción antes del 16. Sin aprobación o credenciales no se afirma despliegue exitoso. |

No se reduce el alcance por iniciativa del agente. Si se agota la reserva, el usuario decide la reorganización y se informa el incumplimiento previsto antes del plazo.
