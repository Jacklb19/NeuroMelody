# Créditos de los registros de ejemplo

Los archivos `nsr001.json` y `nsr002.json` contienen tramos derivados de
[Normal Sinus Rhythm RR Interval Database, versión 1.0.0](https://physionet.org/content/nsr2db/1.0.0/),
aportada a PhysioNet por Phyllis Stein y Rochelle Goldsmith.

Licencia de la base y de estos extractos:
[Open Data Commons Attribution License 1.0](https://opendatacommons.org/licenses/by/1-0/).
La licencia MIT del código no reemplaza la licencia de estos datos.

Cada extracto comprende los primeros 30 minutos desde el primer latido anotado.
Los intervalos RR se calculan como diferencias entre las posiciones de latidos
consecutivos a 128 Hz y se convierten a milisegundos. Se conservan todas las
clases de latido; el filtrado de calidad se aplica durante la reproducción.
Las anotaciones que no representan latidos se omiten. No contienen señales ECG,
identificadores de usuarios de NeuroMelody ni etiquetas de entrenamiento.

Para reproducir la extracción: `node scripts/recordings/extract.ts`.
El script verifica el SHA-256 publicado por PhysioNet y guarda en cada JSON
el archivo de origen, su huella, la frecuencia, el inicio y la duración.

Referencia de PhysioNet: Pollard, T., et al. (2026).
*PhysioNet as a global platform for biomedical research*. Nature Health.
https://doi.org/10.1038/s44360-026-00096-z
