# Fuentes de pulso — qué puede usar NeuroMelody y qué no

Investigación del 12 oct 2026 para decidir qué fuentes añadir además de la banda de pecho y la cámara. No es una decisión: las opciones están al final.

**Lo que la app necesita.** NeuroMelody corre en el navegador y adapta la música con dos cosas: el pulso y la variación entre latidos. Para la segunda hace falta el tiempo entre cada latido y el siguiente (intervalo RR), no solo las pulsaciones por minuto. Casi todos los relojes comparten las pulsaciones y nada más.

**Cómo leer la confianza.** «Alta»: fuente del fabricante o del estándar, abierta y leída. «Media»: fuente independiente seria, o del fabricante pero sin el detalle. «Baja»: solo foros o fichas de tienda. «Sin verificar»: no se encontró fuente; no se da por cierto.

## Dispositivos

Todos usan el mismo camino: Bluetooth desde Chrome, con el servicio estándar de frecuencia cardíaca, que es el que la app ya lee. En ese servicio el intervalo RR es un campo opcional: cada fabricante decide si lo envía.

| Dispositivo | ¿Se lee desde la web? | ¿Latido a latido? | Qué hay que activar | Confianza |
|---|---|---|---|---|
| Polar H10 y H9 (banda de pecho) | Sí | **Sí** | Nada; electrodos húmedos y que otra app no la tenga ocupada | Alta |
| Wahoo TICKR (banda de pecho) | Sí | **Sí** | Nada | Media-alta |
| Garmin HRM-Dual y HRM-Pro (banda) | Sí | Probable, con reportes de que a veces envía solo pulsaciones | Nada | Media |
| Bandas baratas (Coospo H6/H808S, Magene H64) | Probablemente | Sin verificar: solo fichas de tienda | — | Baja |
| Polar Verity Sense y OH1 (brazalete óptico) | Sí | No por la vía estándar; solo con la app de Polar y en reposo absoluto | Modo frecuencia cardíaca | Media-alta |
| Relojes Garmin desde 2019-2020 (FR245/945, Fenix 6 y posteriores) | Sí | Solo pulsaciones, según lo publicado | «Transmitir frecuencia cardíaca» | Media |
| Relojes y pulseras Huawei | Sí, función oficial | Solo pulsaciones | Ajustes → transmisión de datos de frecuencia cardíaca | Media-alta |
| Amazfit con Zepp OS 3 o posterior | Sí | Solo pulsaciones (no se menciona otra cosa) | App «Heart Rate Push» en el reloj | Media-baja |
| Xiaomi Mi Band / Smart Band | Irregular en las antiguas; recientes sin verificar | Solo pulsaciones | Opción de emisión en la app | Baja |
| Fitbit Charge 6, Pixel Watch 2 o posterior | Existe el perfil oficial, pero exige emparejar; desde la web no está probado | No se menciona | «HR on Equipment» o «Connected Fitness» | Alta (existe) / baja (desde la web) |
| Samsung Galaxy Watch | Solo con una app de terceros en el reloj | Solo pulsaciones | Instalar y abrir esa app | Media |
| WHOOP | Emite desde su app | Sin verificar | «Heart Rate Broadcast» | Media-baja |
| Apple Watch | No, salvo apps puente de terceros | — | — | Media |
| Anillos (Oura, Ultrahuman, RingConn) | **No** | — | — | Media (Oura); sin verificar los otros |

Los anillos no emiten en vivo: suben los datos a su nube, con minutos u horas de retraso. Lo mismo vale para las API en la nube de Garmin, Fitbit y Google Health Connect: sirven para historiales, no para música que reacciona en el momento.

## El navegador

- **Bluetooth desde la web:** funciona en Chrome y Edge (Android, Windows, macOS, ChromeOS). No funciona en Firefox ni en Safari. **En iPhone no hay ninguna vía soportada**: todos sus navegadores usan el motor de Safari. Confianza alta.
- **Cámara con el dedo:** la linterna se puede encender desde la web también en Safari de iPhone (reportado en iOS 17.5; confianza media-alta). El límite es la velocidad: a 30 imágenes por segundo cada imagen dura 33 ms, así que hay que interpolar y pedir reposo. Los estudios no coinciden: uno encontró el pulso medio excelente y la variación (RMSSD) insuficiente frente a un electrocardiograma; otro, en reposo, la encontró aceptable. La variación es la cifra más frágil. Confianza media.
- **Acelerómetro del celular apoyado en el pecho:** un estudio con una app nativa, 9 personas tumbadas, detectó más del 98 % de los latidos. En el navegador el sensor está limitado a unas 60 lecturas por segundo y no hay nada publicado que lo demuestre ahí. En iPhone pide permiso expreso. Confianza media-baja: es un experimento, no una fuente.
- **Vídeo de la cara, sin contacto:** el pulso medio sale con un error de 1 o 2 pulsaciones; la variación de una persona concreta es poco fiable y empeora con movimiento o mala luz. Confianza media.

## Qué significa para la app

1. **Con latido a latido, hoy:** solo las bandas de pecho (Polar H9/H10, Wahoo TICKR y, con prueba previa, Garmin), en Android o computador. Es lo que ya hay.
2. **La cámara es la única fuente que casi todo el mundo tiene, incluido el iPhone.** Merece la mejora: interpolar entre imágenes, exigir reposo y avisar cuando la señal no alcanza para la variación.
3. **Relojes y pulseras (Garmin, Huawei, Amazfit, Polar óptico):** se pueden leer, pero dan solo pulsaciones. Para usarlos la app necesitaría un **modo solo pulso**: adaptar la música con la tendencia del pulso y decir claramente que la variación no está disponible. El clasificador actual usa tres entradas y dos son de variación, así que haría falta una regla o un modelo aparte, entrenado solo con el pulso.
4. **Anillos y Apple Watch:** no son posibles desde una web.
5. **Acelerómetro y vídeo de la cara:** experimentos; no dan variación fiable en el navegador.

## Opciones para decidir

| Opción | Qué da | Qué cuesta |
|---|---|---|
| A. Mejorar la cámara | La fuente universal deja de ser «experimental» si la prueba en el celular sale bien | Trabajo de señal y una prueba contra la banda |
| B. Modo solo pulso para relojes | Abre la app a quien ya tiene un reloj Garmin, Huawei o Amazfit | Decisión de diseño (ADR): qué hace la música sin variación y qué se le dice a la persona; un clasificador solo con el pulso |
| C. Comprar y probar una banda barata | Saber si una banda de 20 a 30 dólares envía latido a latido | El costo de la banda; 10 minutos de prueba en `/diagnostics` |
| D. Experimento con el acelerómetro | Una fuente sin hardware, si funciona | Incierto; puede no servir |

Recomendación: A y C primero (mejoran lo que ya existe y cuestan poco), B después, como bloque propio con su ADR, y D solo si sobra tiempo.

## Fuentes consultadas

- Polar: `github.com/polarofficial/polar-ble-sdk` (documentación de H10, Verity Sense y datos PPI); `phyphox.org/wiki` (H9/H10 por el servicio estándar).
- Estándar: `bluetooth.com/specifications/specs` (Heart Rate Service 1.0: el campo RR es opcional).
- Compatibilidad con variabilidad: `elitehrv.com` (lista de monitores compatibles); `github.com/kieranabrennan/blehrm`.
- Garmin, relojes y bandas: `dcrainmaker.com` (transmisión por Bluetooth, 2020; reseña de TICKR).
- Huawei: `consumer.huawei.com` (transmisión de datos de frecuencia cardíaca).
- Fitbit y Pixel: `support.google.com/fitbit/answer/14236705`.
- Navegadores: `caniuse.com/web-bluetooth`; `developer.chrome.com/docs/capabilities/bluetooth`; lista `public-web-bluetooth` del W3C (posición de WebKit, sep 2024); `bugs.webkit.org/show_bug.cgi?id=243075` (linterna en Safari); MDN (`DeviceMotionEvent.requestPermission`).
- Estudios: Peng et al. 2015 (cámara frente a electrocardiograma, PMC4309304); Plews et al. 2017 (cámara en reposo); Landreani et al. 2016 (acelerómetro, solo el resumen); Woelk et al. 2026 (vídeo facial, leído en un agregador).
- API en la nube: `developer.garmin.com` (Health API); `developer.android.com` (Health Connect); `dev.fitbit.com` (intradía).

No se pudieron abrir, y por eso no respaldan nada de lo anterior: las fichas oficiales de producto de Garmin, WHOOP, la comunidad de Samsung y la documentación de Oura.
