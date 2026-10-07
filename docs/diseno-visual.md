# Diseño visual de NeuroMelody

El rediseño de las pantallas existentes mantiene las rutas, los contratos y el comportamiento de S4. No implementa funciones de S5–S7. Su alcance es la presentación de RF-02, RF-11, RF-12, RF-17 y RF-18 y los controles accesibles de RNF-09.

## Dirección

Una interfaz de escucha serena: papel marfil, tinta verde bosque, títulos con serif y texto de controles con sans serif. Se usan fuentes disponibles en el dispositivo (Palatino/Georgia y Segoe UI/Helvetica Neue), sin descargas, dependencias ni recursos externos. No hay degradados, efectos de cristal ni animaciones decorativas.

Inicio conserva sus dos recorridos. Advertencias usa una columna de lectura y mantiene íntegros los textos obligatorios y la aceptación explícita. El plan convierte cada duración existente en una opción pulsable con radio nativo. Diagnóstico muestra capacidades en filas y conserva la reevaluación. En la sesión, música y estado musical comparten una superficie; fuente y señal se separan con líneas, sin tarjetas anidadas.

## Sistema compartido

- `src/index.css` concentra colores, tipografía, espaciado, controles, foco y composición responsive. `PageHeading` comparte la cabecera de las cinco pantallas; `Layout` mantiene navegación y enlace para saltarla.
- Los parámetros musicales se presentan como pares semánticos `dt`/`dd`: escalón, tempo actual, destino, modo y capas programados. La confianza no calibrada queda junto al estado estimado y se conserva el aviso literal de permanencia.
- La gráfica usa los tokens `--color-chart-*` y, para sus medidas, `--chart-margin-*`, `--chart-label-offset`, `--chart-hatch-spacing`, `--chart-marker-half-size` y `--chart-line-width-*` (px o rem, siempre positivos). `readChartPalette` los lee en el hilo principal y envía al Worker la paleta completa (colores, fuente y medidas); el Worker la rechaza en su frontera si falta una medida o no es un número positivo. `--chart-line-width-series` da también el grosor de la línea de tendencia del resumen. El fondo del lienzo coincide con el fondo utilizado por las pruebas de contraste.
- El control fijo «Detener» usa un símbolo cuadrado, texto y un tono tierra con borde visible. Se reserva espacio al final de la sesión y margen de desplazamiento para los controles enfocados. Se conserva Esc y el comportamiento del aviso de duración.
- Avisos y errores usan ámbar/tierra, lenguaje descriptivo y mensajes existentes. Carga, desconexión y datos insuficientes siguen mostrando texto explícito, sin indicadores ficticios.
- Formularios nativos, controles principales de al menos 48 px, foco visible y `prefers-reduced-motion`. En colores forzados, selección y foco conservan señales del sistema.
- La composición pasa a una columna por debajo de 800 px. El plan muestra seis duraciones en escritorio y tres columnas en pantallas menores. La navegación se apila en móvil.

## Referencias y comprobación

Se consultaron los metadatos de Radio Group y reproductores de música en 21st.dev. Se observó la referencia de [Radio Group de Origin UI](https://21st.dev/@originui/components/radio-group). Se adaptó el patrón de opción completa seleccionable con radios nativos; no se copió código ni una plantilla, ni se instalaron componentes. La consulta de inspiración falló por transporte; las búsquedas de catálogo respondieron.

La verificación automatizada de contraste exige 4,5:1 para texto y 3:1 para bordes, foco y trazos informativos. `e2e/visual.spec.ts` verifica todas las pantallas a 360, 768 y 1280 px, ausencia de desbordamiento horizontal, sesión conectada, detención con Esc, foco, movimiento reducido y estados de carga/error provocados únicamente dentro de la prueba. Guarda capturas en `test-results/`, excluido de Git.

La evidencia automática y las capturas no acreditan por sí solas conformidad WCAG completa. La escucha, BLE real, lector de pantalla, zoom manual al 200 % y despliegue requieren comprobación aparte.
