# Plan de trabajo y estado de la entrega — NeuroMelody

Orden de trabajo por prioridad, sin calendario (ADR-13 retirado). Cada bloque se cerró con su verificación antes de pasar al siguiente. El backend vive en un repositorio aparte (ADR-19). Estado al 15 nov 2026.

## Orden de trabajo

| # | Bloque | Repo | Alcance | Estado |
|---|---|---|---|---|
| 1 | S0–S4 | front | Adquisición, hilo de señal, síntesis, lazo de adaptación | Cerrados |
| 2 | S5 Bluetooth y LF/HF | front | RF-01, RF-03, RF-06, RF-12; HU-01, RNF-10 | Cerrado: prueba manual con nRF Connect superada (`prueba-ble.md`) |
| 3 | Limpieza y separación de repos | ambos | ADR-19 a ADR-26 | Hecho |
| 4 | Cámara del celular | front | Propuesta P-01: prototipo en `/diagnostics` y cuarta fuente «experimental» | Hecho; sigue marcada como experimental (ADR-50) |
| 5 | Vista sencilla de la sesión | front | ADR-24 | Hecho |
| 6 | S6.1 Sesiones locales | front | RF-14 (local), RF-15, RF-16; HU-07, HU-08, HU-10; autovaloración (ADR-23) y objetivos (ADR-27) | Hecho |
| 7 | Portada, rediseño, temas e idiomas | front | ADR-28, ADR-30, ADR-31 | Hecho |
| 8 | Cuenta en el navegador y Google (S6.2 front, S6.3) | front | ADR-29, ADR-30: registro, inicio de sesión, recuperación, dos pasos, Google, perfil | Hecho |
| 9 | Clasificador entrenado | front + back | RF-07; ADR-32, `modelo.md` | Hecho |
| 10 | Respiración guiada | front | ADR-33 (1): el orbe marca un ritmo lento de inhalar y exhalar durante la sesión | Hecho: opcional, al tempo de la música (4 tiempos al inhalar, 6 al exhalar) |
| 11 | Tu progreso | front | ADR-33 (2): evolución entre sesiones de pulso, variabilidad y autovaloración | Hecho: `/progress` |
| 12 | S6.2 API y sincronización | back + front | RF-14; ADR-10, ADR-18, ADR-19, ADR-34. JWT con PyJWT, `aal2`, migración, sesiones idempotentes, borrado de sesión y de cuenta, sincronización en el front | Hecho y publicado |
| 13 | Informe para el terapeuta | front | ADR-33 (4): resumen imprimible de un periodo | Hecho: `/report` con la impresión del navegador, solo con sesiones que midieron a la persona |
| 14 | Recolección de datos y reentrenamiento | front + back | ADR-33 (3), ADR-37: protocolo guiado con etiquetas, consentimiento, envío, reentrenamiento y nueva versión del modelo | Hecho el código: grabación guiada en `/collect`, exportación, envío consentido, reentrenamiento programado con control de calidad, publicación con aprobación manual y descarga de la última versión. No se publica una versión nueva hasta tener grabaciones de al menos 5 personas |
| 15 | S6.4 Modelo de lenguaje | back + front | RF-13, RF-15; ADR-08, ADR-36. Plan propuesto y resumen con esquema cerrado | Hecho y publicado; probado con la clave real con `tools/try_language_model.py` |
| 16 | S7.1 Sin conexión | front | HU-09, RNF-08. Sesión completa sin red y cola de sincronización sin duplicados | Hecho: cola de borrados por cuenta, sincronización al volver la conexión y envíos sin duplicados |
| 17 | Paisaje sonoro y mejora de la música | front | ADR-33 (5) y ADR-38 a ADR-42: timbres, ambientes y una mejora profunda del sonido | Hecho y publicado: timbre estéreo, acordes con conducción de voces, frases, variación lenta, programas por intención, tempo que parte del pulso, ambientes (lluvia, mar, viento) y programa para dormir (`diseno-musical.md`) |
| 18 | Recordatorios | front | ADR-33 (6): aviso a la hora elegida, donde el navegador lo permita | Hecho y publicado (ADR-43): borrador de Google Calendar y archivo iCalendar como alternativa |
| 19 | S7.2 Accesibilidad y rendimiento | front | RNF-01 a RNF-06, RNF-09, RNF-10 | Hecho y publicado (ADR-44): sin tareas largas durante la sesión, CPU del navegador a menos de la mitad, paquete principal de 545 a 321 kB, árbol de accesibilidad revisado en 14 pantallas |
| 20 | S7.3 Cierre | ambos | Matriz final, pruebas completas, documentación y demo | Hecho: 896 pruebas unitarias del front, 291 del back, recorridos E2E en Chrome y Edge, continuidad de audio, tipos, lint y build en la integración continua; guion en `demo.md` |
| 21 | Publicación | ambos | Vista previa, producción y comprobaciones reales | Continua: el front se publica en `https://neruomelody.vercel.app` y el back en `https://neuro-m-back.vercel.app`, los dos desde `main` |
| 22 | Mejoras de producto | front | ADR-45 a ADR-47: «Lo que hizo la música», elegir el sonido (cálido, piano o cuencos) y la sesión en tres diapositivas | Hecho y publicado |
| 23 | Lo que te funciona | front + back | ADR-48: contexto de las sesiones, observaciones locales, «Para ti», explicación opcional verificada, nota, sesión rápida y guía de cámara; contrato en `contrato-progress-summary.md` | Hecho y publicado, sin migración ni dependencias nuevas |
| 24 | Revisión, cortes al bloquear, cámara y relojes | front + back | ADR-49 a ADR-51: revisión de la experiencia, diagnóstico del audio al bloquear, margen de contacto y exceso de luz en la cámara, modo solo pulso para relojes con migración | Hecho y publicado en los dos repositorios |
| 25 | Auditoría de calidad y producto de noviembre | front + back | ADR-52 a ADR-64: pausa y fin de sesión, sesiones con dueño, cuota del modelo de lenguaje, registro y contraseñas, app solo con cuenta, biblioteca de escucha, mezcla, vista inmersiva, borradores, tope por cuenta y mundos sonoros | Hecho y publicado |

**Ruta crítica:** API/RLS/aal2 → sincronización → sin conexión → validación → cierre. Los bloques 10, 11 y 13 eran cortos y no dependían del back, por eso fueron antes o entre medias; el 14 necesitaba la API; el 17 y el 18 eran los más costosos o menos fiables y fueron al final. El alcance no se recortó sin una decisión registrada.

## Comprobaciones físicas pendientes

Lo que las pruebas automáticas no pueden cubrir y queda declarado:

- Banda Bluetooth real con intervalos RR (la prueba se hizo con un periférico emulado en nRF Connect).
- Cámara en varios celulares, para retirar la etiqueta «experimental».
- Audio con la pantalla del teléfono bloqueada (bloque 24; ver «Audio interrumpido y diagnóstico local» en `decisiones.md`).
- Rendimiento en un celular de gama media y recorrido con lector de pantalla.

## Recursos del proyecto

| Recurso | Para |
|---|---|
| Android con nRF Connect (o banda con RR prestada) | Prueba manual BLE (HU-01) |
| Celular Android con Chrome | Prototipo de la cámara (P-01) |
| 3–5 oyentes (opcional) | Ajuste de `levels.ts` en un commit aparte |
| Proyecto Supabase Free (us-east-1) | S6 |
| SMTP propio | Confirmación y recuperación de cuenta |
| Autenticador TOTP y dos dispositivos | Segundo factor |
| Proyecto de Vercel para `NeuroM_Back` y sus variables de entorno | Despliegue de la API |
| Google OAuth con redirecciones | S6.3 |
| Clave de Groq con retención cero | S6.4 |
| Equipo de gama media, lector de pantalla, navegadores Android | S7.2 |

## Estado de los requisitos

| RF | Estado |
|---|---|
| RF-01, RF-03 | Verificados con pruebas automáticas y con un periférico emulado (nRF Connect): emparejamiento, recepción y reconexión. Falta una banda real. |
| RF-02, RF-04, RF-05 | Verificados (simulador con cinco escenarios, filtro, calidad e índices). |
| RF-06 | Verificado con referencias sintéticas. |
| RF-07 | Cumplido con un clasificador entrenado con WESAD (ADR-32, `docs/modelo.md`); reglas como respaldo. Sin validación clínica. |
| RF-08, RF-09, RF-10 | Verificados con pruebas; la música se rehízo en el bloque 17 (timbre, acordes, frases, ambientes, tempo que parte del pulso, nivel para dormir) y las muestras se aprobaron escuchándolas. |
| RF-11, RF-17, RF-18 | Verificados; quedan comprobaciones manuales de accesibilidad y nivel acústico. |
| RF-12 | Verificado, incluido LF/HF. |
| RF-13 | Plan con intención (que decide el programa de la música, ADR-38), duración y ambiente; propuesta de duración por el modelo de lenguaje, publicada. |
| RF-14 | Implementado: sesiones en el dispositivo y, con cuenta, dos pasos y consentimiento, también en la nube. Verificado con pruebas automáticas y con las migraciones en una base local; publicado. |
| RF-15, RF-16 | Hechos: resumen con CSV y texto del modelo de lenguaje, historial, «Tu progreso», informe imprimible y «Lo que hizo la música» al terminar. |

| HU | Estado |
|---|---|
| HU-01 | Cumplida con periférico emulado: emparejamiento en menos de 15 s y estado siempre visible. |
| HU-02, HU-04, HU-06 | Cumplidas con evidencia automática; HU-06 con revisión manual pendiente. |
| HU-03 | 30 min sin subdesbordamientos (S3, repetida con el motor nuevo en el bloque 19); el inicio ya no espera a abrir la salida de audio (ADR-44). |
| HU-05 | Cumplida; rendimiento medido en el bloque 19 (ADR-44). |
| HU-07 | Cumplida: plan con intención, duración y ambiente, y propuesta del modelo de lenguaje. |
| HU-08, HU-10 | Cumplidas, con el resumen del modelo de lenguaje. |
| HU-09 | Cumplida (bloque 16): sesión completa sin red y cola de sincronización; las pantallas que se cargan al abrirlas también se guardan para usarlas sin conexión (E2E `offline.spec.ts`). |

| RNF | Estado (15 oct 2026) |
|---|---|
| RNF-01 | 60 s sin subdesbordamientos en cada cambio del motor y 30 min sin ninguno con el motor de los bloques 17 a 19 (15 oct). |
| RNF-02 | Menos de 2 s desde la aceptación (E2E `adaptation.spec.ts`). |
| RNF-03 | Ninguna rampa de tempo menor de 20 s, también la del ajuste al pulso (ADR-39). |
| RNF-04 | Sin tareas largas desde que se conecta el pulso hasta detener la música; una sola al cargar la pantalla (ADR-44). |
| RNF-05 | En el portátil de pruebas, ≈ 50 % de un núcleo sumando página y proceso gráfico con pantalla de 130 Hz (antes ≈ 120 %). Falta medir en un celular de gama media. |
| RNF-06 | Límite de salida, aviso al final del plan y cada 60 min; el programa para dormir se apaga solo, sin aviso (ADR-41). |
| RNF-07 | La señal se procesa en el dispositivo; solo viajan resúmenes con consentimiento y dos pasos, y las grabaciones guiadas que la persona decide enviar (ADR-37). |
| RNF-08 | Ver HU-09. |
| RNF-09 | Árbol de accesibilidad revisado en 14 pantallas sin controles sin nombre ni saltos de títulos; falta la prueba con lector de pantalla. |
| RNF-10 | Bluetooth en Chrome y Edge; el resto con el simulador o la cámara. |

## Riesgos

| Riesgo | Respuesta |
|---|---|
| No hay periférico real | nRF Connect y la cámara del celular; HU-01 queda como comprobación manual pendiente, declarada. |
| Recuperación TOTP, RLS/aal2 o duplicados bloquean la sincronización | Supabase, SMTP y el autenticador listos antes de S6.2; la nube nunca se abre sin `aal2`. |
| El proyecto de Supabase se pausa por inactividad (plan Free) | Restaurarlo desde el panel; `GET /v1/health` consulta Supabase y sirve de aviso. |
| CORS o CSP entre los dos dominios fallan en remoto | Probar con la vista previa de ambos proyectos antes de la publicación. |
| Rendimiento o audio en móvil, accesibilidad, actualización de la PWA | Ensayo de 30 min y muestra de accesibilidad en S7.2. |
| Variables o cabeceras distintas en producción | Publicar con margen para corregir antes de la entrega. |
