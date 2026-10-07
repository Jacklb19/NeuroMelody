# Plan de trabajo — NeuroMelody

Orden de trabajo por prioridad, sin calendario (ADR-13 retirado). Cada bloque se cierra con su verificación antes de pasar al siguiente. El backend vive en un repositorio aparte (ADR-19).

## Orden de trabajo

| # | Bloque | Repo | Alcance | Estado |
|---|---|---|---|---|
| 1 | S0–S4 | front | Adquisición, hilo de señal, síntesis, lazo de adaptación | Cerrados |
| 2 | S5 Bluetooth y LF/HF | front | RF-01, RF-03, RF-06, RF-12; HU-01, RNF-10 | Código hecho; falta la prueba manual BLE (`prueba-ble.md`) |
| 3 | Limpieza y separación de repos | ambos | ADR-19 a ADR-24 | Hecho |
| 4 | Cámara del celular | front | Propuesta P-01: prototipo en `/diagnostics` y, si funciona, cuarta fuente de señal | Pendiente |
| 5 | Vista sencilla de la sesión | front | ADR-24 | Pendiente |
| 6 | S6.1 Sesiones locales | front + back | RF-14 (local), RF-15, RF-16; HU-07, HU-08, HU-10; autovaloración (ADR-23) | Pendiente |
| 7 | S6.2 Cuenta, API y sincronización | back + front | RF-14; ADR-10, ADR-18, ADR-19. Correo, TOTP completo, JWT, migraciones RLS/aal2, sesiones idempotentes, borrado y `docs/autenticacion.md` | Pendiente |
| 8 | S6.3 Google | back + front | Google por redirección y revisión integrada | Pendiente |
| 9 | S6.4 Modelo de lenguaje | back + front | RF-13, RF-15; ADR-08. Plan propuesto y resumen con esquema cerrado | Pendiente |
| 10 | S7.1 Sin conexión | front | HU-09, RNF-08. Sesión completa sin red y cola de sincronización sin duplicados | Pendiente |
| 11 | S7.2 Accesibilidad y rendimiento | front | RNF-01 a RNF-06, RNF-09, RNF-10 | Pendiente |
| 12 | S7.3 Cierre | ambos | Matriz final, pruebas completas, documentación y demo | Pendiente |
| 13 | Publicación | ambos | Push del usuario, vista previa y producción, comprobaciones reales | Pendiente |

**Ruta crítica:** sesión local → cuenta/TOTP/API/RLS/aal2 → sincronización → sin conexión → validación → publicación. La cámara y la vista sencilla no la bloquean. El agente no recorta alcance por su cuenta.

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
| RF-01, RF-03 | Implementados y probados con GATT simulado; falta la prueba con periférico real. |
| RF-02, RF-04, RF-05 | Verificados (simulador con cinco escenarios, filtro, calidad e índices). |
| RF-06 | Verificado con referencias sintéticas. |
| RF-07 | **Limitado** (ADR-14): estimador por reglas, sin clasificador entrenado. |
| RF-08, RF-09, RF-10 | Verificados con pruebas y escucha del usuario. |
| RF-11, RF-17, RF-18 | Verificados; quedan comprobaciones manuales de accesibilidad y nivel acústico. |
| RF-12 | Verificado, incluido LF/HF. |
| RF-13 | Plan manual hecho; propuesta por modelo en S6.4. |
| RF-14, RF-15, RF-16 | Pendientes en S6 y S7. |

| HU | Estado |
|---|---|
| HU-01 | Pendiente de la prueba manual (conexión < 15 s y estado visible). |
| HU-02, HU-04, HU-06 | Cumplidas con evidencia automática; HU-06 con revisión manual pendiente. |
| HU-03 | 30 min sin subdesbordamientos (S3); falta medir el inicio < 1 s en vista previa. |
| HU-05 | Cumplida; revisión de rendimiento en S7. |
| HU-07 | Plan manual hecho; falta la propuesta del modelo. |
| HU-08, HU-09, HU-10 | Pendientes en S6 y S7. |

## Riesgos

| Riesgo | Respuesta |
|---|---|
| No hay periférico real | nRF Connect y, si se aprueba tras el prototipo, la cámara del celular; si nada basta, HU-01 queda como comprobación manual pendiente, declarada. |
| Recuperación TOTP, RLS/aal2 o duplicados bloquean la sincronización | Tener Supabase, SMTP y el autenticador listos antes de S6.2; la nube nunca se abre sin `aal2`. |
| El proyecto de Supabase se pausa por inactividad (plan Free) | Restaurarlo desde el panel; la consulta programada que lo evita se añade cuando haya API. |
| CORS o CSP entre los dos dominios fallan en remoto | Probar con la vista previa de ambos proyectos antes de la publicación. |
| Rendimiento o audio en móvil, accesibilidad, actualización de la PWA | Ensayo de 30 min y muestra de accesibilidad en S7.2. |
| Variables o cabeceras distintas en producción | Publicar con margen para corregir antes de la entrega. |
