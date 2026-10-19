# Cortes de audio al bloquear el teléfono

**19 oct 2026 · Plan aprobado por el usuario (P-08).** Prioridad anterior al bloque 23. Hay correcciones y diagnóstico locales, sin publicar. El fallo de audio al bloquear no está cerrado: falta la comprobación física en el Xiaomi.

## Reproducción comunicada por el usuario

Xiaomi 11 Lite, Chrome, modo de prueba con simulador. Al bloquear el teléfono la música sigue, pero con tintineos o cortes; se normaliza al desbloquear. La cámara no participó en esta prueba. Falta conocer la versión de Chrome y Android, salida de audio y si sucede con todos los instrumentos y ambientes.

## Lo comprobado y lo que falta

- La síntesis y su secuenciación corren dentro de `synthesizer.worklet.ts` y `SynthesisCore.ts`, con reloj de muestras. La música no se alimenta desde el temporizador del simulador.
- El simulador usa temporizadores y entrega lo acumulado cuando se retrasa. Que cambie su frecuencia de entrega no demuestra que sea la causa de los cortes del audio.
- `browserFactory.ts` pide `latencyHint: 'playback'` y 48 kHz. No corresponde proponer simplemente cambiar una latencia que ya está configurada para escuchar.
- La salida actual va a `context.destination`. Existe una alternativa `MediaStreamDestination → <audio>`, desactivada (`OUTPUT_THROUGH_AUDIO_ELEMENT = false`), con pruebas unitarias de sus conexiones. No se ha demostrado que esa alternativa resuelva el bloqueo en Android.
- `PlaybackPanel` configura Media Session y Detener; eso no acredita continuidad de audio con la pantalla apagada. El final de sesión se programa en el reloj de audio.
- Antes del ajuste, `useAudioEngine` mantenía su estado de interfaz sin escuchar los cambios del contexto. Corregido localmente: muestra la interrupción real y permite reanudar o detener. «Sonando» por sí solo no acredita ausencia de cortes.
- Existe `playbackStats` para contar interrupciones de salida en navegadores que lo expongan. Su ausencia no significa cero cortes. Con la salida mediante `<audio>`, el propio código advierte que esas estadísticas no miden el último tramo audible.

Hipótesis por separar: interrupción o suspensión del contexto frente a procesamiento/salida que no llega a tiempo mientras el teléfono está bloqueado. No se confirma ahorro de batería, falta de CPU ni una política concreta de Xiaomi sin medición en el dispositivo.

La documentación de [Chrome sobre AudioWorklet](https://developer.chrome.com/blog/audio-worklet-design-pattern) explica que exceder el tiempo disponible para procesar un bloque produce cortes; no identifica la causa de este caso. La documentación de [Media Session](https://web.dev/articles/media-session) describe su integración con los controles del sistema; no garantiza eliminar interrupciones al bloquear.

## Plan aprobado

**Requisitos:** HU-03 (escucha continua), HU-06 y RF-11 (Detener), RNF-01 (sin subdesbordamientos), RNF-05 (costo en móvil), RNF-06 (nivel y fin de sesión). Mantener ADR-07, ADR-16, ADR-19, ADR-25 y ADR-31. Front solamente, rama propuesta `fix/background-audio` desde `dev`, sin dependencias ni servicios externos.

1. **Medición local y visible para la persona.** En `/diagnostics`, un panel para iniciar una prueba de audio y descargar un registro técnico después de bloquear y desbloquear. Capturar estados reales de `AudioContext`, cambios de visibilidad, reloj de audio, frecuencia, latencia y contadores disponibles antes y después; incluir instrumento, ambiente y versión del navegador. Nada de latidos, notas, cuenta o envíos a la red. Mantener las advertencias y Detener. El registro debe señalar qué contadores no están disponibles.
2. **Separar las causas.** Comparar primer plano y segundo plano en Chrome de escritorio, con y sin simulador, registrando qué visibilidad se consiguió realmente. En el teléfono, repetir una prueba breve de pantalla encendida → bloqueada → desbloqueada. Separar bloqueo físico de cambiar de pestaña: una prueba de escritorio no sustituye a la del Xiaomi.
3. **Corrección con evidencia.** Si el contexto se interrumpe, reflejarlo en el estado e investigar su recuperación sin reproducir después de una detención. Si suben los cortes mientras sigue ejecutándose, medir el costo de síntesis y la ruta de salida. Probar como candidata la ruta `<audio>` ya existente sin doble salida; no activarla globalmente ni declararla solución antes de comparar. Cualquier cambio de sonido, arquitectura o comportamiento se documenta antes de aplicarlo.
4. **Verificar.** Pruebas de estados, interrupción, detención y liberación de recursos; tipos, lint, batería completa y build. Repetir la prueba de audio de 60 s y la larga si cambia motor o salida. E2E de sesión, fin del plan y controles del sistema. Guardar registro de la prueba física con resultado del usuario antes de cerrar el fallo.

**Archivos previstos:** `features/audio/engine/AudioEngine.ts`, `browserFactory.ts`, `playbackStats.ts`, `features/audio/ui/useAudioEngine.ts`, `PlaybackPanel.tsx`, pruebas de audio y `features/diagnostics/`; solo tocar `audio/core/` o worklets si una medición lo justifica. Textos en los dos idiomas y estilos con tokens existentes.

## Resultado local

- `/diagnostics` permite una prueba de 3 minutos, con advertencias de uso, elección de sonido y ambiente, comparación de salida actual y reproductor alternativo, Detener y exportación de un registro técnico. Recoge cambios de visibilidad y contexto y los contadores disponibles; acota la memoria y no envía datos ni guarda sesiones.
- La salida alternativa sigue siendo una comparación en diagnóstico. La sesión normal conserva su salida actual; no se ha demostrado una mejora al bloquear Android. El contador del contexto se marca como insuficiente para medir el último tramo de esa alternativa.
- Corregido el estado de interfaz ante interrupciones reales, conservando Detener y el reinicio por acción de la persona. Detener un contexto suspendido silencia su envolvente inmediatamente, para impedir un resto de sonido si el sistema lo reanuda después.
- Se liberan los contextos si falla la carga o el inicio, o si termina de abrirse el audio después de salir o detener durante la preparación. El prototipo de cámara también libera una captura que termina de abrirse después de salir: antes podía dejarla activa, incluida su linterna.
- Comparación del sintetizador: las muestras coincidieron exactamente con las originales, pero el ahorro de una optimización experimental fue pequeño e inconsistente. Se retiró; el sintetizador y sus worklets no cambian.
- La prueba preliminar de 40 segundos en Chrome de escritorio dio cero cortes registrados. La automatización mantuvo `visibilityState: visible` incluso al seleccionar otra pestaña; por tanto, **no acredita segundo plano ni bloqueo**. No se ha medido temperatura real ni confirmado una política de batería como causa.
- Se comprobaron ambas salidas y suspensión/reanudación real del contexto en Chrome, en 390 y 1280 px, claro y oscuro, español e inglés; también el registro descargado y las advertencias iniciales. El cambio de calendario elegido por el usuario es independiente de este diagnóstico.

Capturas y registros de la interfaz en `audio-samples/capturas/audio-bloqueo/`. Evidencia preliminar de audio y comparación de síntesis en `audio-samples/capturas/desvanecido/`. La verificación final de tipos, lint, pruebas, build, recorridos y audio queda en `PROGRESS.md`.

## Criterio de cierre

Música continua al bloquear y desbloquear el Xiaomi en la prueba acordada, con Detener y el final del plan funcionando, sin esconder la falta de estadísticas ni confundir el reloj interno con lo audible. No se fuerza a mantener encendida la pantalla como sustituto de la corrección. Las pruebas automáticas de escritorio acompañan la prueba real; no acreditan por sí solas el bloqueo en Android.

La publicación para probar cambios en producción requiere la orden expresa del usuario. Hasta entonces la versión publicada conserva el fallo comunicado.
