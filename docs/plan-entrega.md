# Plan de entrega — NeuroMelody

Calendario aprobado (ADR-13), actualizado el 6 oct 2026 con el backend en repositorio aparte (ADR-19). Desarrollo hasta el **12 nov**; publicación y revisión el **13 y el 17 nov**. Lunes a viernes, sin los festivos 12 oct, 2 nov y 16 nov: 27 días efectivos, 25 de esfuerzo y 2 de reserva.

## Calendario

| Bloque | Fechas (2026) | Repo | Alcance | Estado |
|---|---|---|---|---|
| S0–S4 | 26 sep – 5 oct | front | Plantilla, adquisición, hilo de señal, síntesis, lazo de adaptación | Cerrados |
| S5.1 Bluetooth | 6–8 oct | front | RF-01, RF-03, HU-01, RNF-10 | Código hecho el 6 oct; prueba manual el 13 oct |
| S5.2 LF/HF | 9, 13–14 oct | front | RF-06, RF-12 | Código hecho el 6 oct |
| Reserva | 15–16 oct | — | Incidencias de S5 y ajuste con 3–5 oyentes (propuesto) | — |
| S6.1 Sesiones locales | 19–21 oct | front | RF-14 (local), RF-15, RF-16; HU-07, HU-08, HU-10 | Pendiente |
| S6.2 Cuenta, API y sincronización | 22–23, 26–30 oct | back + front | RF-14; ADR-10, ADR-18, ADR-19. Correo, TOTP completo, JWT, migraciones RLS/aal2, sesiones idempotentes, borrado y `docs/autenticacion.md` | Pendiente |
| S6.3 Google y cierre | 3 nov | back + front | Google por redirección y revisión integrada | Pendiente |
| S6.4 Modelo de lenguaje | 4–5 nov | back + front | RF-13, RF-15; ADR-08. Plan propuesto y resumen con esquema cerrado | Pendiente |
| S7.1 Sin conexión | 6, 9 nov | front | HU-09, RNF-08. Sesión completa sin red y cola de sincronización sin duplicados | Pendiente |
| S7.2 Accesibilidad y rendimiento | 10–11 nov | front | RNF-01 a RNF-06, RNF-09, RNF-10 | Pendiente |
| S7.3 Congelación | 12 nov | ambos | Matriz final, pruebas completas, documentación y demo | Pendiente |
| Publicación | 13 y 17 nov | ambos | Push del usuario, preview y producción, comprobaciones reales | Pendiente |

**Ruta crítica:** BLE/espectro → sesión local → cuenta/TOTP/API/RLS/aal2 → sincronización → sin conexión → validación → publicación. Si se agota la reserva, el usuario decide la reorganización; el agente no recorta alcance por su cuenta.

## Recursos que aporta el usuario

| Recurso | Fecha | Uso |
|---|---|---|
| Android con nRF Connect (o banda con RR prestada) | 13 oct; tope 16 oct | HU-01 y reconexión, según `prueba-ble.md` |
| 3–5 oyentes | 16 oct (propuesto) | Ajuste de `levels.ts` en un commit aparte |
| Proyecto Supabase Free (us-east-1) | 21 oct | S6.2 |
| SMTP de Gmail con contraseña de aplicación | 21 oct | Confirmación y recuperación de cuenta |
| Autenticador TOTP y dos dispositivos | 22 oct | Flujo completo de segundo factor |
| Proyecto de Vercel para `NeuroM_Back` y variables de entorno | 22 oct | Despliegue de la API |
| Google OAuth con redirecciones | 30 oct | S6.3 |
| Clave de Groq con retención cero | 3 nov | S6.4 |
| Equipo de gama media, lector de pantalla, navegadores Android | 6 nov | S7.2 |
| Aprobación de operaciones remotas | 13 nov | Publicación |

## Estado de los requisitos

| RF | Estado |
|---|---|
| RF-01, RF-03 | Implementados y probados con GATT simulado; falta la prueba con periférico real. |
| RF-02, RF-04, RF-05 | Verificados (simulador con cinco escenarios, filtro, calidad e índices). |
| RF-06 | Verificado con referencias sintéticas. |
| RF-07 | **Limitado** (ADR-14): estimador por reglas, sin clasificador entrenado. |
| RF-08, RF-09, RF-10 | Verificados con pruebas y escucha del usuario (5 oct). |
| RF-11, RF-17, RF-18 | Verificados; quedan comprobaciones manuales de accesibilidad y nivel acústico. |
| RF-12 | Verificado, incluido LF/HF. |
| RF-13 | Plan manual hecho; propuesta por modelo en S6.4. |
| RF-14, RF-15, RF-16 | Pendientes en S6 y S7. |

| HU | Estado |
|---|---|
| HU-01 | Pendiente de la prueba manual (conexión < 15 s y estado visible). |
| HU-02, HU-04, HU-06 | Cumplidas con evidencia automática; HU-06 con revisión manual pendiente. |
| HU-03 | 30 min sin subdesbordamientos (S3); falta medir el inicio < 1 s en preview. |
| HU-05 | Cumplida; revisión de rendimiento en S7. |
| HU-07 | Plan manual hecho; falta la propuesta del modelo. |
| HU-08, HU-09, HU-10 | Pendientes en S6 y S7. |

## Riesgos

| Riesgo | Respuesta |
|---|---|
| No hay periférico real | nRF Connect el 13 oct; si no basta, HU-01 queda como comprobación manual pendiente, declarada. |
| Recuperación TOTP, RLS/aal2 o duplicados bloquean la sincronización | Recursos listos el 21–22 oct; la nube nunca se abre sin `aal2`. |
| CORS o CSP entre los dos dominios fallan en remoto | Probar con la vista previa de ambos proyectos antes del 6 nov. |
| Rendimiento o audio en móvil, accesibilidad, actualización de la PWA | Ensayo de 30 min y muestra de accesibilidad antes del 10 nov. |
| Variables o cabeceras distintas en producción | Publicar el 13 nov para dejar margen hasta el 17. |
