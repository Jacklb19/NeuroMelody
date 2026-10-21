# Plan de trabajo — NeuroMelody

Orden de trabajo por prioridad, sin calendario (ADR-13 retirado). Cada bloque se cierra con su verificación antes de pasar al siguiente. El backend vive en un repositorio aparte (ADR-19).

## Orden de trabajo

| # | Bloque | Repo | Alcance | Estado |
|---|---|---|---|---|
| 1 | S0–S4 | front | Adquisición, hilo de señal, síntesis, lazo de adaptación | Cerrados |
| 2 | S5 Bluetooth y LF/HF | front | RF-01, RF-03, RF-06, RF-12; HU-01, RNF-10 | Cerrado: prueba manual con nRF Connect superada (`prueba-ble.md`) |
| 3 | Limpieza y separación de repos | ambos | ADR-19 a ADR-26 | Hecho |
| 4 | Cámara del celular | front | Propuesta P-01: prototipo en `/diagnostics` y cuarta fuente «experimental» | Hecho; falta la prueba del usuario en su celular para quitar la etiqueta |
| 5 | Vista sencilla de la sesión | front | ADR-24 | Hecho |
| 6 | S6.1 Sesiones locales | front | RF-14 (local), RF-15, RF-16; HU-07, HU-08, HU-10; autovaloración (ADR-23) y objetivos (ADR-27) | Hecho |
| 7 | Portada, rediseño, temas e idiomas | front | ADR-28, ADR-30, ADR-31 | Hecho |
| 8 | Cuenta en el navegador y Google (S6.2 front, S6.3) | front | ADR-29, ADR-30: registro, inicio de sesión, recuperación, dos pasos, Google, perfil | Hecho; falta la prueba del usuario contra Supabase real |
| 9 | Clasificador entrenado | front + back | RF-07; ADR-32, `modelo.md` | Hecho |
| 10 | Respiración guiada | front | ADR-33 (1): el orbe marca un ritmo lento de inhalar y exhalar durante la sesión | Hecho: opcional, al tempo de la música (4 tiempos al inhalar, 6 al exhalar); falta que el usuario la pruebe con música y con «reducir movimiento» |
| 11 | Tu progreso | front | ADR-33 (2): evolución entre sesiones de pulso, variabilidad y autovaloración | Hecho: `/progress` con las sesiones del dispositivo; falta la revisión del usuario con sesiones reales |
| 12 | S6.2 API y sincronización | back + front | RF-14; ADR-10, ADR-18, ADR-19, ADR-34. JWT con PyJWT, `aal2`, migración, sesiones idempotentes, borrado de sesión y de cuenta, sincronización en el front | Hecho y publicado el 12 oct: el back responde en `https://neuro-m-back.vercel.app` y el front lo llama. Falta la prueba del usuario con una cuenta real |
| 13 | Informe para el terapeuta | front | ADR-33 (4): resumen imprimible de un periodo | Hecho, en `dev` (12 oct): `/report` con la impresión del navegador, solo con sesiones que midieron a la persona. Falta la revisión del usuario con sesiones reales y una impresión de prueba |
| 14 | Recolección de datos y reentrenamiento | front + back | ADR-33 (3), ADR-37: protocolo guiado con etiquetas, consentimiento, envío, reentrenamiento y nueva versión del modelo | Hecho el código, en `dev` (12 oct): grabación guiada en `/collect`, exportación, envío consentido a la nube, reentrenamiento programado con control de calidad, publicación con aprobación de una persona y descarga de la última versión por la app. Falta la preparación del usuario (migración, caché de WESAD, secretos y entorno en GitHub) y grabaciones reales de al menos 5 personas; hasta entonces no hay ninguna versión nueva del modelo |
| 15 | S6.4 Modelo de lenguaje | back + front | RF-13, RF-15; ADR-08, ADR-36. Plan propuesto y resumen con esquema cerrado | Hecho, en `dev` (12 oct). Probado con la clave real de Groq desde `tools/try_language_model.py` en español; falta la prueba del usuario en la app y en inglés |
| 16 | S7.1 Sin conexión | front | HU-09, RNF-08. Sesión completa sin red y cola de sincronización sin duplicados | Hecho, en `dev` (12 oct): cola de borrados por cuenta, sincronización automática al volver la conexión y envíos sin duplicados. Falta la prueba del usuario cortando la red con su cuenta |
| 17 | Paisaje sonoro y mejora de la música | front | ADR-33 (5): elegir entre dos o tres timbres o ambientes; el usuario pidió además (12 oct) una mejora profunda de cómo suena la música. Toca el motor de audio | En curso (12 oct), en la rama `feat/richer-music`: timbre estéreo, acordes con conducción de voces, frases, variación lenta, reverberación y fundido real entre modos, con muestras «antes y después» (`diseno-musical.md`). Música integrada en `dev` el 13 oct con el visto bueno del usuario. Ampliado por P-06 (ADR-38 a ADR-42): programas por intención, tempo que parte del pulso, ambientes (lluvia, mar, viento), programa para dormir, recorrido guiado y sesión que se explica. Publicado el 18 oct; falta la prueba del usuario en la app |
| 18 | Recordatorios | front | ADR-33 (6): aviso a la hora elegida, donde el navegador lo permita | Publicado el 18 oct (ADR-43). Ajuste local del 19 oct elegido por el usuario: abrir un borrador de Google Calendar para guardar allí; el archivo queda como alternativa explícita. Falta comprobar el guardado y aviso real |
| 19 | S7.2 Accesibilidad y rendimiento | front | RNF-01 a RNF-06, RNF-09, RNF-10 | Hecho y publicado el 18 oct (ADR-44): sin tareas largas durante la sesión, CPU del navegador a menos de la mitad, paquete principal de 545 a 321 kB, árbol de accesibilidad revisado en 14 pantallas. Falta medir en un celular de gama media y la prueba con lector de pantalla |
| 20 | S7.3 Cierre | ambos | Matriz final, pruebas completas, documentación y demo | Código y documentación listos en local (19 oct): 786 pruebas del front con cobertura, 251 del back, 37 E2E Chrome/Edge/audio, tipos, lint y build. Guion y lista de revisión al día. El cierre de producción y las comprobaciones físicas siguen pendientes del usuario |
| 21 | Publicación | ambos | Push del usuario, vista previa y producción, comprobaciones reales | Continua: el front se publica en `neruomelody.vercel.app` y el back en `neuro-m-back.vercel.app`, los dos desde `main`. Última publicación del front: 18 oct (bloques 17 a 20 y 22) |
| 22 | Mejoras de producto | front | ADR-45 a ADR-47: «Lo que hizo la música» guardado con la sesión, elegir el sonido (cálido, piano o cuencos) y la sesión en tres diapositivas | Publicado el 18 oct y probado por el usuario en el celular. Ajuste local del 19 oct: desvanecido sencillo por pedido suyo. Prioritario: diagnóstico y correcciones locales de audio al bloquear (P-08); pendiente la prueba física |
| 23 | Lo que te funciona | front + back | ADR-48: contexto de las sesiones, observaciones locales, «Para ti», explicación opcional verificada, nota, sesión rápida y guía de cámara; ver `plan-bloque-23.md` y `contrato-progress-summary.md` | Implementado y verificado en local el 19 oct; integración y publicación autorizadas después por el usuario. Sin migración ni dependencias nuevas. 786 pruebas front, 251 back, 37 E2E y verificaciones con servicios simulados. Resultado del despliegue y pendientes físicos en `PROGRESS.md` |
| 24 | Revisión, cortes al bloquear, cámara y relojes | front + back | ADR-49 a ADR-51 y P-08: revisión de la experiencia, variantes de diagnóstico al bloquear, margen de contacto y exceso de luz en la cámara, modo solo pulso para relojes con migración | Hecho en local el 20 oct en cuatro ramas, sin fusionar ni publicar. Faltan las pruebas físicas del usuario (Xiaomi bloqueado, cámara, reloj o nRF Connect) y aplicar la migración al publicar |

**Ruta crítica:** API/RLS/aal2 → sincronización → sin conexión → validación → cierre. Los bloques 10, 11 y 13 son cortos y no dependen del back, por eso van antes o entre medias; el 14 necesita la API; el 17 y el 18 son los más costosos o menos fiables y van al final. El agente no recorta alcance por su cuenta.

## Recursos que aporta el usuario

| Recurso | Para |
|---|---|
| Android con nRF Connect (o banda con RR prestada) | Prueba manual BLE (HU-01) |
| Xiaomi 11 Lite con Chrome | Prototipo de la cámara (P-01) |
| 3–5 oyentes (opcional) | Ajuste de `levels.ts` en un commit aparte |
| Proyecto Supabase Free (us-east-1) | S6 |
| SMTP de Gmail con contraseña de aplicación | Confirmación y recuperación de cuenta |
| Autenticador TOTP y dos dispositivos | Segundo factor |
| Proyecto de Vercel para `NeuroM_Back` y sus variables de entorno | Despliegue de la API |
| Google OAuth con redirecciones | S6.3 |
| Clave de Groq con retención cero | S6.4 |
| Equipo de gama media, lector de pantalla, navegadores Android | S7.2 |
| Aprobación de operaciones remotas | Publicación |

## Estado de los requisitos

| RF | Estado |
|---|---|
| RF-01, RF-03 | Verificados con pruebas automáticas y con un periférico emulado (nRF Connect): emparejamiento, recepción y reconexión. Falta una banda real. |
| RF-02, RF-04, RF-05 | Verificados (simulador con cinco escenarios, filtro, calidad e índices). |
| RF-06 | Verificado con referencias sintéticas. |
| RF-07 | Cumplido con un clasificador entrenado con WESAD (ADR-32, `docs/modelo.md`); reglas como respaldo. Sin validación clínica. |
| RF-08, RF-09, RF-10 | Verificados con pruebas; la música se rehízo en el bloque 17 (timbre, acordes, frases, ambientes, tempo que parte del pulso, nivel para dormir) y el usuario aprobó las muestras. Falta su escucha en la app. |
| RF-11, RF-17, RF-18 | Verificados; quedan comprobaciones manuales de accesibilidad y nivel acústico. |
| RF-12 | Verificado, incluido LF/HF. |
| RF-13 | Plan con intención (que decide el programa de la música, ADR-38), duración y ambiente; propuesta de duración por el modelo de lenguaje, publicada. |
| RF-14 | Implementado: sesiones en el dispositivo y, con cuenta, dos pasos y consentimiento, también en la nube. Verificado con pruebas automáticas y con la migración en una base local; publicado; falta la prueba con una cuenta real. |
| RF-15, RF-16 | Hechos: resumen con CSV y texto del modelo de lenguaje (publicado), historial, «Tu progreso», informe imprimible y «Lo que hizo la música» al terminar. |

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
| RNF-07 | La señal se procesa en el dispositivo; solo viajan resúmenes con consentimiento y dos pasos. |
| RNF-08 | Ver HU-09. |
| RNF-09 | Árbol de accesibilidad revisado en 14 pantallas sin controles sin nombre ni saltos de títulos; falta la prueba con lector de pantalla. |
| RNF-10 | Bluetooth en Chrome y Edge; el resto con el simulador o la cámara. |

## Riesgos

| Riesgo | Respuesta |
|---|---|
| No hay periférico real | nRF Connect y, si se aprueba tras el prototipo, la cámara del celular; si nada basta, HU-01 queda como comprobación manual pendiente, declarada. |
| Recuperación TOTP, RLS/aal2 o duplicados bloquean la sincronización | Tener Supabase, SMTP y el autenticador listos antes de S6.2; la nube nunca se abre sin `aal2`. |
| El proyecto de Supabase se pausa por inactividad (plan Free) | Restaurarlo desde el panel; la consulta programada que lo evita se añade cuando haya API. |
| CORS o CSP entre los dos dominios fallan en remoto | Probar con la vista previa de ambos proyectos antes de la publicación. |
| Rendimiento o audio en móvil, accesibilidad, actualización de la PWA | Ensayo de 30 min y muestra de accesibilidad en S7.2. |
| Variables o cabeceras distintas en producción | Publicar con margen para corregir antes de la entrega. |
