# Prueba BLE con nRF Connect — 13 de octubre de 2026

Guía preparada en S4 para la comprobación manual de S5 (RF-01/RF-03, HU-01, RNF-10). No se implementó una fuente BLE en S4 ni se verificó un teléfono. El periférico será un Android; el navegador central debe estar en **otro equipo o teléfono**. Activar Bluetooth y permisos de dispositivos cercanos que solicite Android. El teléfono debe admitir publicidad BLE como periférico; si no, usar otro Android o la banda.

## Configuración exacta del servidor

En nRF Connect for Android, abrir **Configure GATT server**, crear configuración `NeuroMelody RR` y **ADD SERVICE → Custom service**. Usar un servicio personalizado con UUID estándar para controlar los bytes; el servicio Heart Rate prefabricado envía datos de muestra que no deben suponerse provistos de RR. La documentación de Nordic describe la configuración y añade automáticamente CCCD cuando se activa Notify. [Nordic: GATT server](https://github.com/NordicSemiconductor/Android-nRF-Connect/blob/main/documentation/README.md)

| Atributo | Configuración |
|---|---|
| Servicio primario Heart Rate | `0000180d-0000-1000-8000-00805f9b34fb` (`0x180D`) |
| Característica Heart Rate Measurement | `00002a37-0000-1000-8000-00805f9b34fb` (`0x2A37`) |
| Propiedad de la característica | **Notify**; no requiere Read ni Write ni cifrado para esta emulación |
| Client Characteristic Configuration Descriptor | `00002902-0000-1000-8000-00805f9b34fb` (`0x2902`), Read/Write, valor inicial `00 00`; comprobar que se creó automáticamente, sin duplicarlo |

El servicio HRS exige notificación y CCCD. El navegador se suscribe: el CCCD pasa a `01 00`. Los campos multibyte son little-endian; RR se expresa en unidades de 1/1024 s, no en milisegundos. Body Sensor Location es opcional; Energy Expended queda desactivado en esta configuración, por lo que no hace falta Heart Rate Control Point. [Bluetooth SIG: Heart Rate Service](https://www.bluetooth.com/wp-content/uploads/Files/Specification/HTML/HRS_v1.0/out/en/index-en.html), [GATT Supplement](https://btprodspecificationrefs.blob.core.windows.net/gatt-specification-supplement/GATT_Specification_Supplement.pdf)

En **Advertiser → +**, crear un anuncio conectable; incluir UUID de servicio `0x180D` y, si cabe, nombre local `NeuroMelody RR` (o poner nombre en scan response). Seleccionar la configuración GATT creada e iniciar publicidad. En el otro equipo abrir la app por HTTPS o localhost y, en `/session`, elegir **Origen de la señal → Banda Bluetooth** y pulsar **Conectar banda**; el selector del navegador solo lista dispositivos con el servicio `heart_rate`. La selección debe reconocer `heart_rate`; después suscribirse a `heart_rate_measurement`. Mantener el emulador abierto durante la prueba. [Nordic: Advertiser y servidor](https://github.com/NordicSemiconductor/Android-nRF-Connect/blob/main/documentation/README.md)

## Notificaciones con RR

En la pestaña **SERVER** de la conexión, enviar los bytes como hexadecimal a `0x2A37`, después de la suscripción. Son cargas completas, sin cabecera ATT. `0x16`: FC de 8 bits, contacto soportado y detectado, sin energía y con RR. Cada fila se envía como una notificación distinta; no escribir al CCCD para enviar una medición.

| Bytes hex | Resultado esperado del parser |
|---|---|
| `16 3C 00 04` | FC 60 lpm, contacto true, RR `[1000]` ms |
| `16 40 C0 03` | FC 64 lpm, contacto true, RR `[937.5]` ms |
| `16 60 80 02` | FC 96 lpm, contacto true, RR `[625]` ms |
| `16 3C 00 04 10 04` | FC 60 lpm, contacto true, RR `[1000, 1015.625]` ms |
| `14 3C 00 04` | FC 60 lpm, contacto false, RR `[1000]` ms; el filtro descarta los RR por contacto |
| `10 3C 00 04` | FC 60 lpm, contacto null, RR `[1000]` ms; dispositivo sin estado de contacto |

Los valores son vectores sintéticos de protocolo, no datos de entrenamiento ni etiquetas de activación. Las conversiones son `units × 1000 / 1024`: `0400` = 1024, `03C0` = 960, `0280` = 640, `0410` = 1040. Se verifican con el parser existente antes de la prueba física. No cambiar bruscamente RR en una sesión destinada a probar el filtro: las filas primero verifican formato de manera independiente; para continuidad empezar por una serie estable.

Para automatizar envíos, importar una macro XML de operaciones de servidor y activarla en bucle después de suscribirse. Ejemplo propio con una notificación cada segundo:

```xml
<macro name="NeuroMelody RR sample" icon="PLAY">
  <send-notification service-uuid="0000180d-0000-1000-8000-00805f9b34fb"
    characteristic-uuid="00002a37-0000-1000-8000-00805f9b34fb" value="163C0004" />
  <sleep timeout="1000" />
</macro>
```

Nordic documenta `send-notification`, importación XML y repetición de macro. Si la versión instalada no permite lanzar la macro en esa conexión, usar los envíos manuales de SERVER para verificar bytes; registrar versión y limitación, sin asumir que el bucle se ejecutó. [Nordic: operaciones de servidor y macros](https://github.com/NordicSemiconductor/Android-nRF-Connect/blob/main/documentation/Macros/README.md)

### Macro alternativa con ocho RR variables

Importar esta segunda macro y activar repetición después de suscribirse. Envía FC 60, contacto detectado y RR de **1000, 1015.625, 1000, 984.375, 968.75, 984.375, 1015.625 y 1031.25 ms**. Cada pausa dura 1 s; los ocho RR suman exactamente 8 s. La variación pequeña debe pasar el filtro sin descartes y producir RMSSD distinto de cero. Las unidades, orden little-endian, contacto y aceptación por BeatFilter se verifican leyendo los bytes de esta macro en `documentedMacro.test.ts`.

```xml
<macro name="NeuroMelody variable RR sample" icon="PLAY">
  <send-notification service-uuid="0000180d-0000-1000-8000-00805f9b34fb"
    characteristic-uuid="00002a37-0000-1000-8000-00805f9b34fb" value="163C0004" />
  <sleep timeout="1000" />
  <send-notification service-uuid="0000180d-0000-1000-8000-00805f9b34fb"
    characteristic-uuid="00002a37-0000-1000-8000-00805f9b34fb" value="163C1004" />
  <sleep timeout="1000" />
  <send-notification service-uuid="0000180d-0000-1000-8000-00805f9b34fb"
    characteristic-uuid="00002a37-0000-1000-8000-00805f9b34fb" value="163C0004" />
  <sleep timeout="1000" />
  <send-notification service-uuid="0000180d-0000-1000-8000-00805f9b34fb"
    characteristic-uuid="00002a37-0000-1000-8000-00805f9b34fb" value="163CF003" />
  <sleep timeout="1000" />
  <send-notification service-uuid="0000180d-0000-1000-8000-00805f9b34fb"
    characteristic-uuid="00002a37-0000-1000-8000-00805f9b34fb" value="163CE003" />
  <sleep timeout="1000" />
  <send-notification service-uuid="0000180d-0000-1000-8000-00805f9b34fb"
    characteristic-uuid="00002a37-0000-1000-8000-00805f9b34fb" value="163CF003" />
  <sleep timeout="1000" />
  <send-notification service-uuid="0000180d-0000-1000-8000-00805f9b34fb"
    characteristic-uuid="00002a37-0000-1000-8000-00805f9b34fb" value="163C1004" />
  <sleep timeout="1000" />
  <send-notification service-uuid="0000180d-0000-1000-8000-00805f9b34fb"
    characteristic-uuid="00002a37-0000-1000-8000-00805f9b34fb" value="163C2004" />
  <sleep timeout="1000" />
</macro>
```

Esta macro prueba RR variables válidos y el paso por el filtro; los descartes se comprueban por separado con pérdida de contacto y vectores de artefactos. No pretende inducir Alta/Baja: la verificación automática del lazo S4 sigue usando simulador y registros. La macro y el lazo BLE físico se comprobarán en S5; no se declara ejecución en Android con una prueba del XML.

## Guardar vectores y repetir la prueba

1. En nRF Connect usar **Show log** y **SAVE** para exportar el registro; exportar también configuración GATT y macro. Registrar versión nRF/Android, navegador y fecha, FC/RR y orden de envíos. No guardar dirección MAC, nombre de persona, identificador de dispositivo ni secretos en el repositorio. Nordic documenta la exportación del registro. [Registro nRF Connect](https://github.com/NordicSemiconductor/Android-nRF-Connect/blob/main/documentation/README.md)
2. En S5 registrar además el valor recibido en `characteristicvaluechanged`, copiando exactamente los bytes comprendidos por `DataView.byteOffset` y `byteLength`. Comparar hex recibido con el enviado y anotar tiempos relativos desde conexión. No guardar anuncios completos ni RR reales de terceros como fixture pública.
3. Convertir solo bytes sintéticos o anonimizados autorizados en casos de prueba junto a `src/features/acquisition/ble/parseHeartRateMeasurement.test.ts`: hex, resultado esperado (FC/contacto/RR) o error. Si un valor llega truncado, conservarlo tal como llegó y exigir `HeartRateMeasurementError`; no repararlo antes de probar.
4. La regresión debe pasar parser → contrato de fuente → índices → adaptación; probar desconectar/publicidad OFF, reintentos y publicidad ON, detener y recargar con «Reconectar banda». Repetir en Chrome/Edge del equipo y navegadores Android disponibles. La emulación no acredita compatibilidad con una banda real.

Guardar informes completos fuera de Git; añadir solo fixtures pequeños revisados como commit separado cuando exista evidencia de S5. El 13 oct se verifica conexión <15 s, RR, estado visible y reconexión. Fecha tope de correcciones de parser: 16 oct, usando la reserva del 15–16 si hace falta y documentando el nuevo caso; no integrar artefactos ni modificar el contrato sin aprobación cuando cambie el alcance.
