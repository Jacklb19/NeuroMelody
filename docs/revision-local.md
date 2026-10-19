# Revisión de la entrega — 19 oct 2026

Esta entrega reúne el bloque 23 y los ajustes del teléfono en front y back, desarrollados en `feat/block-23`. El usuario autorizó su integración y publicación el 19 oct. No hay migraciones ni dependencias nuevas. Los bloques anteriores conservan su código; la verificación física y los servicios reales se revisan aparte.

Verificación automática: 786 pruebas del frontend con cobertura, 251 del backend y 37 recorridos Chrome/Edge/audio; tipos, lint y build correctos. Para revisar la interfaz local sin cuenta ni API real, desde la carpeta NeuroMelody: `node .claude/dev-no-account.mjs` y abrir `http://localhost:4319/app`. Las observaciones usan el historial de ese origen local, separado del de producción.

Se comprobó además una sesión rápida completa para dormir, de tres minutos reales en Chrome de escritorio: terminó sola, suspendió el audio y registró cero subdesbordamientos. Esto no sustituye la prueba del teléfono bloqueado.

## Funciones nuevas

| Dónde | Qué revisar |
|---|---|
| Inicio | «Tengo 3 minutos» conserva las últimas elecciones conocidas y pide las advertencias si faltan. La música empieza solo al pulsar Iniciar. Se explica que la calibración puede ocupar todo el plan. |
| Tu progreso | «Lo que te funciona», después de los totales. Cambiar entre últimas 7, últimas 30 y todas; abrir el método y la tabla. Sin datos suficientes, explica qué falta. |
| Preparar sesión | «Para ti» propone sonido, ambiente o duración por separado, cuando hay evidencia suficiente. Solo cambia campos al aceptar. Se pueden editar después; las elecciones de un enlace se respetan. |
| Resumen | Escribir una nota, guardar, recargar, editar y quitar. Límite de 200 caracteres. Solo en este dispositivo. |
| Sesión, cámara | Cubrir la cámara, esperar los latidos, retirar y volver a apoyar el dedo; revisar los mensajes. Sigue experimental y no mide presión. |
| Progreso, con cuenta y API | Aceptar la explicación opcional. Se envían solo comparaciones agregadas; el modelo elige frases verificadas y no añade cifras. Al cambiar historial, filtro, idioma o cuenta la explicación desaparece. Sin servicio se mantienen los cálculos locales. |

Las sesiones nuevas guardan sonido, ambiente y fecha/hora local al empezar. Las antiguas no tenían esos datos y **no se reconstruyen** desde las preferencias actuales. Para comparar una opción hacen falta al menos cinco sesiones válidas en cada uno de dos grupos de la misma intención y programa; una valoración necesita ambas respuestas. Esto explica por qué el panel puede no proponer nada todavía. Las pruebas usan datos ficticios y no los añaden a tu historial.

## Ajustes solicitados antes del bloque 23

- Desvanecido sencillo entre diapositivas; Detener sigue accesible al moverse entre ellas.
- Recordatorio: «Abrir Google Calendar» prepara el evento para revisar días, hora y aviso, y guardarlo allí. Volver a abrirlo prepara otro evento. La descarga de archivo es una alternativa explícita.
- Audio interrumpido: se muestra su estado real y permite reanudar o detener; no se reinicia solo al cambiar de visibilidad.
- Diagnóstico de audio en `/diagnostics`: comparar salidas y descargar mediciones locales. Un contador no disponible no se presenta como cero.
- Cancelación de aperturas tardías de audio y cámara al salir. Las notas y valoraciones simultáneas se conservan sin sobrescribirse.

## Verificación que requiere el teléfono o servicios reales

- [ ] En el Xiaomi 11 Lite con Chrome y simulador, comparar pantalla encendida, bloqueada y desbloqueada. Descargar los registros de las dos salidas del diagnóstico. **El corte y el calentamiento siguen abiertos.**
- [ ] Revisar el desvanecido en el teléfono, la liberación de cámara/linterna y la utilidad de su guía.
- [ ] Escuchar instrumentos y ambientes; verificar una sesión completa para dormir y el final del plan rápido.
- [ ] Guardar el evento en una cuenta real de Google Calendar y comprobar el aviso.
- [ ] Cuenta real, TOTP, sincronización entre dispositivos y una prueba sin conexión.
- [ ] Explicación con el proveedor real, después de publicar ambos repositorios; las pruebas locales simulan el servicio.
- [ ] Banda real, lector de pantalla y rendimiento/batería en el teléfono.
- [ ] Grabaciones consentidas de participantes y preparación externa para reentrenar; no se han inventado datos ni publicado un modelo nuevo.

La evidencia automática y las capturas se resumen en `PROGRESS.md`. Las capturas de esta entrega usan datos ficticios y están en `audio-samples/capturas/bloque-23/`; no describen resultados de una persona real.
