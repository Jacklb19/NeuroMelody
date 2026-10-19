# Guion de demostración — NeuroMelody

Recorrido de unos 10 minutos para presentar la app. Funciona sin banda ni cuenta: el pulso viene del simulador. Conviene hacerlo en Chrome de escritorio, con audífonos o altavoces, y el volumen del sistema moderado.

## Antes de empezar

- Abrir la app publicada (o `node .claude/dev-no-account.mjs` desde la carpeta `NeuroMelody`, en `http://localhost:4319`).
- Tener aceptadas las advertencias de uso en ese navegador, para no leerlas en la demostración (o mostrarlas como parte del recorrido: son obligatorias antes de la primera sesión).
- Si se va a mostrar la cuenta: entrar antes, con la verificación en dos pasos ya hecha.

## 1. La idea (1 min) · portada `/`

Qué es: música que se compone en el navegador y se adapta al pulso. Nació para acompañar a personas con dolor crónico y sirve también para calmarse, dormir, respirar o hacer una pausa. Recalcar el aviso: no es un dispositivo médico ni mide el dolor.

## 2. Preparar la sesión (2 min) · Inicio → «Preparar mi sesión»

- Tocar varias intenciones y leer cómo cambia la frase de la tarjeta «Tu sesión»: la intención decide en qué escalón empieza la música y hasta dónde baja. Dejar elegida «Relajarme» (empieza a paso medio, así se ve la música volver un escalón en el paso 3).
- Duración 10 minutos y ambiente «Lluvia».
- Con cuenta: «Proponme una duración» muestra el modelo de lenguaje, marcado como texto generado.

## 3. La sesión (4 min) · `/session`

- Los tres pasos de arriba: medir el pulso, cómo te sientes, iniciar.
- «No tengo cómo medir mi pulso: probar la app» → Simulador, escenario «Activación creciente», velocidad ×10. Conectar.
- Valorar cómo te sientes e «Iniciar música».
- Mostrar el recorrido de la música (A paso medio → En calma), el ritmo «ajustado a tu pulso» y «¿Qué significa?» junto al estado estimado.
- Abrir «Detalles técnicos»: señal, índices (RMSSD, LF/HF) y parámetros musicales.
- Con la velocidad ×10, la calibración termina en unos 20 s y el escenario hace subir la activación: cuando el estado pasa a «Alta», la música vuelve un escalón («Con movimiento» aparece en el recorrido) en menos de 2 s, con una rampa de al menos 20 s.

## 4. El cierre (1 min)

«Detener» (o la tecla Esc): silencio en 50 ms. Aparece «Lo que hizo la música» y, en una sesión medida, el enlace al resumen. En modo de prueba se explica que no se guarda.

## 5. Lo demás (2 min)

- **Historial y «Tu progreso»:** evolución del pulso, la variación entre latidos y la autovaloración entre sesiones (necesita sesiones medidas guardadas).
- **«Lo que te funciona» y «Para ti»:** comparaciones locales con al menos cinco sesiones válidas por opción. Si las sesiones antiguas no tenían contexto, explicar el estado sin datos en vez de inventar preferencias. Con cuenta y consentimiento, pedir la explicación automática de las cifras; ante un fallo se mantienen las observaciones locales.
- **Una nota en el resumen:** escribirla, guardar, recargar y quitarla. El texto queda solo en este dispositivo.
- **«Tengo 3 minutos»:** entrada rápida desde Inicio con las últimas elecciones; mantiene advertencias, inicio manual y calibración de tres minutos.
- **Informe** imprimible desde «Tu progreso».
- **Perfil:** tema e idioma, recordatorio que abre un borrador de Google Calendar para revisar y guardar (archivo como alternativa), privacidad y «Ayuda a mejorar la app» (grabación guiada para reentrenar el clasificador).
- **Para dormir:** una sesión con «Descansar antes de dormir» atenúa la pantalla a los 20 s y se apaga sola al final.

## Preguntas que suelen salir

- **¿La música es grabada?** No: se compone nota a nota en el hilo de audio del navegador; cada sesión es distinta.
- **¿Qué decide la música?** Un clasificador entrenado con WESAD estima si la activación sube, baja o no cambia respecto a tus primeros minutos; con tres estimaciones iguales seguidas la música cambia un escalón, siempre de forma gradual.
- **¿Qué sale del dispositivo?** Nada de la señal. Con cuenta, dos pasos y consentimiento, solo resúmenes de sesión.
- **¿Y sin internet?** La sesión completa funciona sin red.
