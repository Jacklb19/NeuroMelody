# Escuchar y pulso en vivo — definición para aprobar (P-17)

**Estado:** aprobado e implementado el 16 nov 2026 como ADR-66 (`decisiones.md`); sus pantallas están en `pantallas.md`. Este documento queda como la definición detallada.

> **Revisión de creación y vista (ADR-70, P-18).** Las opciones de Crear terminan en un resumen y la acción «Crear pieza». La confirmación indica qué mundo se acaba de crear. La pieza activa tiene una identidad propia mientras se ajusta la siguiente. Crear y reproducir conservan la vista compacta o ampliada. Se amplía desde el control de apertura o el título de la barra mini. Guardar y Guardada comparten el encabezado, y «Ajustes de sonido» reúne la mezcla y el avance automático. Biblioteca y cola deducen el mundo de cada melodía.

> **Continuidad aprobada el 16 nov (ADR-69).** Sustituye los apartados anteriores que indican detener al salir: la música sigue al navegar y las otras pantallas muestran una barra global también en pausa. Sesión medida, grabación, diagnóstico y muestra del plan toman prioridad. La siguiente melodía empieza sola si está activado el interruptor (encendido inicialmente); la última termina. Recargar conserva la recuperación en pausa y salir de la cuenta olvida la pieza. Detalles vigentes en ADR-69 y `pantallas.md`.

> **Revisión del 16 nov (ADR-67).** Escuchar pasó a ser un reproductor de música. Donde este documento dice otra cosa, manda ADR-67:
> - Cada melodía tiene duración (15, 30, 45 o 60 min, la de la pieza al guardarla) y una **barra de tiempo** que se puede mover, con ±15 s; el punto guardado es una marca en la barra y las tarjetas ya no tienen «Desde el minuto».
> - En PC el **reproductor está a la izquierda** y las pestañas a la derecha. Al reproducir se **abre sobre la pantalla** con las melodías como cola (anterior y siguiente); `?player=open` va al historial y «Atrás» lo cierra.
> - En el celular, una **barra mini** abajo (línea de progreso, título, pausar) abre el reproductor a pantalla completa.
> - La duración se elige en Crear (grupo 03), no en el reproductor. La vista inmersiva aparte desaparece: el reproductor abierto la sustituye.
> - La pausa del reproductor sustituye al botón fijo de Detener en Escuchar; Esc y los controles del sistema siguen deteniendo.
> - En la sesión, la barra de «Escuchando» marca los cambios de paso como capítulos.

**Ajustes del usuario ya incorporados:**

- Escuchar es como una sesión, pero sin medir nada.
- Las melodías se guardan en el teléfono **y en la nube**, sin segundo factor.
- Una melodía guardada se puede retomar desde el minuto en que se guardó.
- Desde Escuchar se ofrece «Haz una sesión con este sonido».

---

## 1. Detalles técnicos de la sesión: se quedan donde están

Siguen plegados debajo de las diapositivas de `/session`. Hay tres razones:

1. **Sostienen el análisis.** `SignalPanel` crea el hilo de análisis y le pasa el lienzo de la gráfica, que solo se puede pasar una vez. Si se desmonta, la música deja de adaptarse.
2. **La especificación los pide durante la sesión** (RF-12).
3. **Ya están fuera del camino.**

Lo que una persona quería ver ahí, su pulso, pasa a estar a la vista con el pulso en vivo (§3). Desde él, el enlace «Ver la señal completa» abre los detalles técnicos y lleva hasta ellos.

---

## 2. Escuchar

### 2.1 Qué es

| | **Sesión** | **Escuchar** |
|---|---|---|
| Para qué | Que la música siga tu pulso | Oír música que se crea en el momento |
| Sensor | Sí, o el modo de prueba | No |
| Preparación | Plan, valoración y referencia de 3 min | Eliges y suena |
| Música | Adaptativa o fija | Fija: el paso no cambia solo |
| Lo que queda | Una sesión en el historial, con cifras | Solo las melodías que decidas guardar |
| Cuenta en el progreso | Sí | No |

El enlace «Haz una sesión con este sonido» abre `/plan` con el mismo instrumento, ambiente y textura ya elegidos.

### 2.2 Dónde está

- **Ruta:** `/listen`, dentro del `Layout` y bajo `RequireAccount` y `RequireWarnings`. Pide las advertencias porque suena, igual que la sesión. Se carga al abrirla (`lazy`) y el service worker la guarda para usarla sin conexión.
- **Barra (PC, más de 900 px):** Inicio · Nueva sesión · **Escuchar** · Historial · Progreso. En las capturas de hoy a 1366 px, la píldora de navegación ocupa unos 380 px y le sobra espacio para la quinta entrada. La comprobaré también en la franja de 901 a 1100 px, que es la más justa.
- **Menú del celular (900 px o menos):** la misma lista, con Escuchar en tercer lugar.
- **Inicio:**
  - En la tarjeta principal, debajo de «Tengo 3 minutos», un segundo enlace: «O solo escuchar música».
  - En «Explora NeuroMelody», la tarjeta «Mundos sonoros» pasa a ser «Escuchar», con la misma imagen, y lleva a `/listen`.
  - Si hay melodías guardadas, una fila «Tu última melodía», con un botón para oírla.

### 2.3 Cómo se ve la pantalla

La pantalla sigue el patrón de `/plan`, que ya funciona en los dos tamaños: grupos numerados a la izquierda y una tarjeta clara fija a la derecha. Escuchar cambia «Tu sesión» por el **reproductor**.

**Arriba, en todos los tamaños:**

- El encabezado: «Escuchar» y «Música que se crea mientras la oyes. No necesita sensor.»
- Dos pestañas: **Crear** · **Mis melodías (n)**, que separan elegir el sonido de lo ya guardado. En el celular ahorran mucho desplazamiento.

**Pestaña Crear:**

1. **¿En qué mundo?** Las seis tarjetas de los mundos, el mismo componente del plan.
2. **¿A qué paso?** Con movimiento, A paso medio, En calma o Para dormir: los cuatro niveles que ya existen, con su tempo de catálogo (76, 66, 59 y 50).
3. **Ajustes a mano**, plegados: instrumento, ambiente y textura. Si la combinación deja de ser un mundo, se dice, como en el plan.

La duración no va en Crear sino en el reproductor, porque vale para todo lo que suena, también para una melodía guardada (§2.8).

**Pestaña Mis melodías:** una tarjeta por melodía con:

- El color del mundo, el nombre, el paso, la fecha y el minuto guardado.
- Dos acciones: **Desde el principio** y **Desde el minuto 12**.
- Un menú con Renombrar y Borrar. Borrar pide confirmación con el `ConfirmButton` que ya existe.

Si no hay ninguna: «Cuando algo te guste, guárdalo y aquí lo tendrás.»

**El reproductor:**

- El orbe que respira con la música, con los colores del mundo.
- Qué suena (el mundo o la melodía) y el paso.
- **Durante:** 15, 30, 45 o 60 minutos, como un selector compacto. Se puede cambiar mientras suena; el fundido final se vuelve a programar.
- Reproducir, Detener o Reanudar según el estado (§2.8), el tiempo restante y la barra de avance.
- Volumen y mezcla: **el mismo `PlaybackPanel` de la sesión**, con Detener fijo, Esc y los controles del sistema (Media Session).
- **Guardar esta melodía.** Se activa en cuanto suena y pide un nombre, con uno propuesto («Bosque de niebla · 16 nov»).
- **Vista inmersiva:** solo orbe, tiempo y Detener.
- El enlace a «Haz una sesión con este sonido».

Si cambias algo mientras suena, se aplica al volver a reproducir. El sintetizador fija el instrumento y el ambiente al crearse (ADR-40, ADR-46), y la pantalla lo dice: «Se aplicará al volver a reproducir».

**Por tamaño de pantalla:**

| Ancho | Distribución |
|---|---|
| **Más de 1100 px** (PC) | Dos columnas como `/plan`: pestañas y grupos a la izquierda (unos 580 px) y el reproductor a la derecha (unos 270 px), fijo al desplazarse (`position: sticky`). Mis melodías en dos columnas de tarjetas. |
| **901 a 1100 px** (portátil pequeño, tableta horizontal) | Las mismas dos columnas, más estrechas. Mis melodías en una columna. |
| **900 px o menos** (tableta vertical, celular) | Una columna. Arriba, un reproductor compacto: orbe pequeño, qué suena, el botón grande de reproducir y Guardar. Debajo, las pestañas. Antes de sonar, una **barra fija abajo**, igual que la del plan («Bosque de niebla · 30 min · Reproducir»). Mientras suena, esa barra se cambia por el **Detener fijo a todo lo ancho** que ya tiene la sesión. Nunca hay dos barras a la vez. |
| **360 px** | Mundos y melodías en una columna; duraciones en una cuadrícula de 2×2. Todas las áreas táctiles de al menos 44 px. |

**Tema e idioma:** solo tokens de `index.css`, en claro y oscuro, con `data-world` para los colores como en la sesión. Español e inglés en `i18n/*/listen.ts`.

**Reglas de accesibilidad:**

- Las pestañas son un `tablist` real, que se maneja con las flechas.
- Un solo `h1`.
- El foco va al reproductor al pulsar Reproducir en una melodía.
- El tiempo restante no se anuncia cada segundo.

### 2.4 Cómo suena y cómo termina

- **Música fija:** arranca en el paso elegido y no lo cambia (el modo fijo de ADR-59).
- **Final:** al acabar el tiempo, un fundido silencioso de 2 minutos programado en el reloj de audio, como en ADR-41, sin aviso que contestar. Con «Para dormir», la pantalla se atenúa tras 20 s sin tocarla (`SleepDimmer`).
- **Al salir de `/listen`, la música se detiene,** como al salir de la sesión. Un reproductor que siga sonando por toda la app es otra mejora, más grande.
- **Una sola música a la vez** dentro de la app: Escuchar y la sesión son pantallas distintas y cada una cierra su motor al salir.

### 2.5 Seguridad del audio (ADR-16, sin cambios)

- Volumen de −12 dB por defecto, compresor y recorte suave.
- Detener siempre visible, con Esc y Media Session.
- Como mucho 60 minutos.

La única excepción es la que ya existe para dormir: el final no abre el aviso de fin de plan. Ningún texto dice que la música calme o ayude.

### 2.6 Melodías: qué significa «repetir» y cómo se retoman

**La música nunca se repite sola.** Cada vez que pulsas Reproducir nace una pieza nueva, que no tiene bucles ni se acaba. «Guardar» sirve para lo contrario: **poder volver a oír una pieza concreta que te gustó**, como guardar una canción. Eso no cambia nada del sintetizador: las piezas nuevas siguen siendo distintas cada vez.

**Por qué se puede volver a oír:** el sintetizador decide cada nota con un generador pseudoaleatorio que arranca de una **semilla** (`SynthesisCore`, mulberry32). Con la misma semilla, el mismo instrumento y el mismo paso, las notas salen iguales. Revisé que el sintetizador y el ambiente no usan otro azar que la semilla: el único `Math.random` de todo el audio es el que la elige. Hoy esa semilla se descarta; Escuchar la guarda.

**Retomar desde el minuto guardado: sí se puede.** Se añade un «avance rápido» al sintetizador:

- Al crearse, el sintetizador recorre en silencio las decisiones hasta el minuto pedido, sin producir sonido, y empieza a sonar desde ahí.
- Son pocas cuentas: una hora a 76 pulsos por minuto son unos 9.100 pasos del secuenciador (2 por pulso). Se hace al crear el procesador, no dentro de `process()`, así que respeta ADR-07: nada de reservar memoria en el hilo de audio.
- Lo único que no se reconstruye son las notas largas que ya sonaban en ese instante. Las siguientes entran en su sitio y el comienzo lleva el fundido de entrada de siempre (1,5 s), así que no se nota un corte.
- Una prueba comprueba que, a partir del minuto pedido, las notas son las mismas que si la pieza hubiera sonado entera desde el principio.

Así, cada melodía guarda **el minuto en que la guardaste**, y al oírla eliges **Desde el principio** o **Desde el minuto 12**.

**Lo que se guarda** (unos 200 bytes, ningún dato de salud):

| Campo | Valor |
|---|---|
| `id` | UUID v7, generado en el dispositivo |
| `name` | De 1 a 60 caracteres |
| `seed` | Entero de 0 a 2³¹−1 |
| `instrument`, `ambience`, `profile` | Ids de sus catálogos |
| `level` | `high`, `intermediate`, `target` o `sleep` |
| `positionS` | Segundo en que se guardó (de 0 a 3600) |
| `musicMix`, `ambienceMix` | De 0 a 1 |
| `synthesisVersion` | Versión del sintetizador con que se guardó |
| `createdAt`, `updatedAt` | Fecha y hora |
| `ownerId` | La cuenta; solo en el dispositivo |

El mundo no se guarda: se deduce de las tres elecciones, como en ADR-64.

**Límites que quedan (pocos y raros):**

- **Si en el futuro se cambia el sintetizador** (sus reglas o sus timbres), la misma semilla puede dar otras notas. Por eso cada melodía guarda `synthesisVersion`, una constante que se sube cuando cambie el sonido. Una melodía de una versión anterior se sigue oyendo, con la nota «Puede sonar algo distinta: el sonido de la app se actualizó».
- **El detalle del ambiente**, cada gota de lluvia, puede variar entre equipos con distinta frecuencia de muestreo (44,1 o 48 kHz). Las notas no varían.
- **Tope:** 50 melodías por cuenta.

### 2.7 Dónde se guardan: dispositivo y nube desde el principio

Las melodías no son datos de salud: no llevan pulso ni nada de la persona, salvo el nombre que les pone. Por eso basta con la cuenta, **sin segundo factor ni el consentimiento de los datos de salud**.

**En el dispositivo:**

- IndexedDB, base `neuromelody` en su **versión 3**, con un almacén nuevo `melodies`. La actualización solo crea lo que falta: `sessions` y `drafts` se conservan, con una prueba de migración como en ADR-62.
- Cada cuenta solo ve sus melodías (ADR-61).
- Todo funciona sin conexión.

**En la nube (back):**

- **Migración nueva**, `back/supabase/migrations/20261117000000_melodies.sql`. **La aplicas tú en Supabase** antes de publicar el back.
  - Tabla `melodies`: `id uuid` (lo da el cliente), `user_id uuid` (se borra en cascada con la cuenta), `name`, `seed`, `instrument`, `ambience`, `profile`, `level`, `position_s`, `music_mix`, `ambience_mix`, `synthesis_version`, `created_at` y `updated_at`. Cada columna lleva un `CHECK` con los catálogos y rangos del front.
  - RLS: cada cuenta solo lee, crea, cambia y borra sus filas (`user_id = auth.uid()`), sin `aal2`.
  - Tope de 50 por cuenta con un disparador como el de ADR-63, que rechaza con `54000`.
- **API** (mismo estilo que `/v1/sessions`, con esquemas Pydantic cerrados):
  - `GET /v1/melodies`: la lista de la cuenta.
  - `PUT /v1/melodies/{id}`: crea o actualiza (guardar y renombrar). Reenviar no duplica nada. Con la cuenta llena responde `409 limit_reached`.
  - `DELETE /v1/melodies/{id}`.
  - Pruebas en pytest con cobertura de al menos el 70 %, `ruff` y la prueba SQL con Docker.
- **Sincronización en el front:**
  - Al abrir Escuchar, y después de cada cambio, se combina la lista de la nube con la local. Gana el `updatedAt` más reciente.
  - Lo hecho sin red espera en una cola por cuenta (guardados y borrados) y se envía al volver la conexión.
  - Si la API todavía no tiene `/v1/melodies` (por ejemplo, antes de publicar el back), el front se queda en local sin mostrar errores.
- **Contrato:** `front/docs/contrato-melodies.md`.
- **Borrar la cuenta** borra las melodías de la nube (en cascada) y del dispositivo.
- **La copia de seguridad** (`/account`) pasa a la versión 2, con las melodías, y sigue aceptando la versión 1. Los datos de demostración suman unas melodías de ejemplo.
- **Orden de publicación:** migración → back → front.

### 2.8 Flujo de navegación

#### Una sección con dos pestañas, no dos secciones

«Mis melodías» va **dentro** de Escuchar como segunda pestaña, no como una entrada propia en la barra. Hay tres razones:

1. **Al salir de la pantalla, la música se para.** El `Layout` vuelve a montar la pantalla cada vez que cambia la ruta: el contenedor de la pantalla lleva `key={pathname}`, y también el límite de errores. Si Mis melodías fuera otra sección, pasar de una a otra cortaría la música. Dentro de Escuchar, el reproductor sigue sonando al cambiar de pestaña.
2. **Una melodía solo sirve con el reproductor al lado.** Separarlas obligaría a ir y volver para oírla.
3. **La barra ya tiene cinco entradas.** Una sexta no cabe bien en la píldora de PC entre 901 y 1100 px.

Desde fuera sí hay accesos directos a Mis melodías (ver «Entradas»).

#### Direcciones

| Dirección | Qué abre |
|---|---|
| `/listen` | Escuchar, pestaña **Crear** |
| `/listen?tab=melodies` | Escuchar, pestaña **Mis melodías** |
| `/listen?tab=melodies&melody=<id>` | Mis melodías con esa melodía resaltada y con el foco. **No suena sola** |
| `/listen?tab=<otra cosa>` o una melodía que no existe | Crear, o la lista sin resaltar, sin errores |

- **La pestaña va en la consulta (`?tab=`) y no en la ruta** (`/listen/melodies`), porque un cambio de ruta vuelve a montar la pantalla (razón 1). Cambiar la consulta no la monta de nuevo y el reproductor no se corta.
- **Cambiar de pestaña reemplaza la entrada del historial,** no añade otra (`setSearchParams(…, { replace: true })`). Así, «Atrás» en el celular o el navegador siempre sale de Escuchar hacia donde venías, en vez de saltar entre pestañas.
- **La entrada «Escuchar» de la barra se marca** en las dos pestañas: el `NavLink` compara solo la ruta, y la consulta no cuenta.
- **El título de la pestaña del navegador** cambia con la pestaña: «Escuchar · NeuroMelody» o «Mis melodías · NeuroMelody». El `h1` de la pantalla es siempre «Escuchar».
- **Las pestañas son una subnavegación de enlaces** con `aria-current`, no un `tablist`, porque cambian la dirección. Se ven como un control segmentado.

#### Entradas

| Desde | Lleva a |
|---|---|
| Barra de PC y menú del celular: «Escuchar» | `/listen` (Crear) |
| Inicio, tarjeta principal: «O solo escuchar música» | `/listen` (Crear) |
| Inicio, «Explora»: «Escuchar» (antes «Mundos sonoros») | `/listen` (Crear) |
| Inicio, «Tu última melodía» (si hay alguna): botón «Oír» | `/listen?tab=melodies&melody=<id>`, con esa melodía lista para pulsar |
| Perfil, junto a la copia de seguridad: «Melodías guardadas: 12 · Ver» | `/listen?tab=melodies` |
| Primera vez sin haber aceptado las advertencias | `/warnings`; al aceptar vuelve a la dirección pedida, pestaña incluida (`RequireWarnings` ya guarda la ruta de vuelta) |
| Un enlace directo o una recarga | La misma dirección; la música no suena hasta pulsar |

**Regla de toda la sección: la música solo empieza con un toque dentro de Escuchar.** Ningún enlace ni recarga la hace sonar sola. Es la misma regla de la sesión (ADR-62) y evita que el navegador bloquee el audio por no haber gesto.

#### Estados del reproductor

| Estado | Qué muestra | Acciones |
|---|---|---|
| **Listo** (nada suena) | El sonido elegido en Crear: «Costa nocturna · En calma» | **Reproducir** (pieza nueva) |
| **Sonando** | Qué suena, el tiempo restante y la barra | **Detener**, **Guardar**, duración, volumen y mezcla, vista inmersiva |
| **En pausa** (tras Detener o Esc) | La misma pieza y su minuto | **Reanudar** (la misma pieza, desde donde se paró, con el avance rápido de §2.6), **Nueva pieza**, **Guardar** |
| **Terminada** (se acabó el tiempo) | «Terminó · 30 min» | **Volver a empezar esta pieza**, **Nueva pieza**, **Guardar** |

- **Detener** silencia en menos de 50 ms, como siempre (ADR-16), y deja la pieza en pausa; no se pierde.
- **La duración cuenta el tiempo escuchado:** una pausa no la gasta, como en la sesión (ADR-52).

#### Qué suena frente a qué sonará

- **El reproductor muestra lo que suena; Crear prepara lo que sonará.** Nunca se mezclan:
  - Oír una melodía guardada no cambia las elecciones de Crear.
  - Cambiar algo en Crear mientras suena no toca la música. El reproductor lo dice («Lo nuevo sonará al pulsar Nueva pieza»).
- **Nueva pieza** usa siempre lo elegido en Crear y una semilla nueva.
- **«Haz una sesión con este sonido»** usa lo que **suena**, o lo de Crear si no suena nada.

#### Guardar

1. **Guardar** abre un diálogo (`<dialog>`) con el nombre propuesto. Mientras está abierto, Esc cierra el diálogo y no detiene la música (`PlaybackPanel` ya lo respeta).
2. Al confirmar:
   - Aviso breve: «Guardada en Mis melodías · Ver». «Ver» cambia de pestaña sin cortar la música.
   - El reproductor pasa a mostrar el nombre de la melodía.
   - El botón queda en «Guardada ✓», así que la misma pieza no se guarda dos veces.
3. **Lo que se guarda como minuto** es el de ese momento.
4. **Con 50 melodías,** el diálogo no se abre: «Tienes 50 melodías guardadas. Borra alguna para guardar otra», con un enlace a Mis melodías.
5. **Sin conexión** se guarda igual en el dispositivo, con la marca «Pendiente de subir».

#### Mis melodías

- **Cada tarjeta** tiene **Desde el principio**, **Desde el minuto 12** y un menú con **Renombrar** y **Borrar**.
- **Pulsar una mientras suena otra cosa** cambia a la melodía al momento, sin preguntar. Lo que sonaba queda como «Lo último que sonó» (ver «Salidas»), así que una pieza sin guardar no se pierde.
- **La melodía que está sonando** lleva la marca «Sonando» y no muestra los botones de reproducir.
- **Renombrar** mientras suena cambia también el nombre en el reproductor.
- **Borrar** la que suena no la corta: sigue sonando como «Lo último que sonó», sin guardar, y se puede volver a guardar.
- **Orden:** la más reciente primero.
- **Sincronización:**
  - La lista sale primero del dispositivo y después se combina con la nube.
  - Las melodías que lleguen de otro dispositivo aparecen sin recargar.
  - Las pendientes de subir llevan su marca.
- **Sin melodías:** el texto vacío y un botón **Crear una**, que cambia a la otra pestaña.

#### Salidas

| Cómo se sale | Qué pasa |
|---|---|
| Otra entrada de la barra o del menú, el logo, el avatar o «Atrás» | La música se detiene (como al salir de la sesión). La pieza queda como **«Lo último que sonó»**: al volver a Escuchar, el reproductor aparece **en pausa** con esa pieza y su minuto, listo para Reanudar o Guardar |
| «Haz una sesión con este sonido» | Igual, y abre `/plan` con instrumento, ambiente y textura de lo que sonaba |
| Cerrar la pestaña o la app | Se pierde «Lo último que sonó». Lo guardado sigue en el dispositivo y en la nube |
| Cerrar sesión o cambiar de cuenta | «Lo último que sonó» se guarda por cuenta: otra cuenta no lo ve, y se pierde al cerrar la pestaña. Borrar la cuenta lo borra |

- **«Lo último que sonó»** es una sola pieza por cuenta, en `sessionStorage`: semilla, sonido y minuto. Dura lo que dure la pestaña del navegador y se reemplaza con la siguiente pieza nueva.
- **No hay un aviso de «¿Seguro que quieres salir?».** Salir no pierde nada, así que no hace falta interrumpir.

#### Barras fijas en el celular (900 px o menos)

| Pestaña | Listo | Sonando | En pausa o terminada |
|---|---|---|---|
| **Crear** | Barra «Costa nocturna · 30 min · Reproducir» | Detener a todo lo ancho | Barra con **Reanudar** y **Nueva pieza** |
| **Mis melodías** | Ninguna (cada tarjeta tiene su botón) | Detener a todo lo ancho | Barra con **Reanudar** |

Nunca hay dos barras a la vez, y la lista deja abajo el espacio de la barra para que no tape la última tarjeta. En PC no hay barras: todo está en el reproductor de la columna derecha.

#### Casos que se prueban para que no haya incongruencias

1. Cambiar de pestaña mientras suena: la música no se corta, la barra no se duplica y «Atrás» sale de Escuchar.
2. Recargar en `?tab=melodies`: abre esa pestaña y no suena nada.
3. Ir a Historial mientras suena y volver: la pieza está en pausa en su minuto y Reanudar la sigue.
4. Oír una melodía guardada y después Nueva pieza: suena lo de Crear, no lo de la melodía.
5. Borrar la melodía que suena: sigue sonando, sin guardar.
6. Guardar sin conexión y recuperar la conexión: se sube y pierde la marca de pendiente.
7. Llegar a 50: Guardar lo explica y lleva a Mis melodías.
8. Primera visita sin advertencias desde «Tu última melodía»: tras aceptar, vuelve a esa melodía resaltada.
9. Cambiar el tema o el idioma desde el menú mientras suena: la música sigue (no cambian la ruta).
10. Abrir el menú del celular mientras suena: Detener sigue visible. Esc cierra el menú y también detiene la música, igual que hoy en la sesión: es la regla de seguridad de ADR-16, y como la pieza queda en pausa, no se pierde nada.

### 2.9 Lo que Escuchar no hace

- No mide ni estima estados.
- No usa el modelo de lenguaje.
- No exporta audio.
- No añade sonidos nuevos al sintetizador.

---

## 3. Pulso en vivo mientras se toma la referencia

**El problema:** al iniciar la música, «Escuchando» dice «Tomando tu referencia» durante unos 3 minutos y no muestra nada más. Además, nadie cuenta que **la referencia empieza al conectar el pulso, no al iniciar la música**: la calibración corre con el tiempo de la señal (180 s y al menos 12 lecturas buenas).

**Dónde va:** un componente nuevo, `LivePulse`, en dos lugares:

- **«Cómo llegas»**, debajo de la cifra de pulso que ya está.
- **«Escuchando»**, entre el título del momento y el estado estimado.

**Qué muestra:**

1. **Tu pulso latido a latido:** una línea con el último minuto, calculada con los intervalos entre latidos que ya llegan al hilo principal (60 000 / intervalo). Con un reloj que solo envía el pulso, usa el pulso de cada aviso. Funciona igual con banda, reloj y cámara.
2. **La cifra actual,** grande.
3. **El avance de la referencia:** «Tomando tu referencia: 1:40 de 3:00 · 7 de 12 lecturas», con una barra. Al terminar: «Referencia lista. Desde ahora la música puede cambiar de paso.»
4. El enlace **«Ver la señal completa»**.

**Por tamaño de pantalla:**

- **PC:** la línea ocupa el ancho de la columna del escenario, a unos 120 px de alto.
- **Celular:** va a todo lo ancho de la tarjeta, a unos 96 px, con la cifra encima, y no empuja «Iniciar música» fuera de la primera pantalla a 360×740. Esa medida ya se cuidó en la auditoría del 2 nov y la vuelvo a medir.

**Después de la referencia,** la línea sigue en «Escuchando», más baja. No aparece en la vista inmersiva ni sin fuente.

**Lo que no hace:**

- No propone respirar durante la referencia: falsearía el punto de partida.
- No sustituye la gráfica técnica: es un SVG ligero.
- Solo en esta vista se saltan los intervalos fuera de 300 a 2000 ms.
- No interpreta lo que se ve.

**Accesibilidad y rendimiento:**

- La línea es una imagen con su descripción.
- La cifra no se anuncia en cada latido; el avance de la referencia solo se anuncia al empezar y al terminar.
- Se redibuja como mucho una vez por aviso de la fuente (≈ 1 por segundo), sin animaciones continuas (ADR-44).

**Cambio técnico mínimo:** la instantánea de `AdaptationEngine` añade `signalTimeMs`. No cambia ninguna regla de ADR-12.

---

## 4. Archivos

**Front, nuevos:**

- `src/features/listen/`:
  - `ListenPage.tsx`, `listen.css` y `listenCatalog.ts`.
  - `melody.ts`: tipo y validación.
  - `melodyStore.ts` y `melodyStoreContext.ts`: IndexedDB por cuenta.
  - `syncMelodies.ts`: la nube y la cola.
  - `useMelodies.ts`, `MelodyList.tsx`, `SaveMelodyForm.tsx`, `ListenPlayer.tsx` y `ListenBar.tsx`.
- `src/features/session/LivePulse.tsx` y `livePulse.ts`.
- `src/i18n/es/listen.ts` y `src/i18n/en/listen.ts`.
- `e2e/listen.spec.ts`.
- `docs/contrato-melodies.md`.

**Front, cambian:**

- **Ruta, navegación y textos:** `config/routes.ts`, `app/navigation.ts`, `app/AppRoutes.tsx` e `i18n/*/app.ts`.
- **Audio:**
  - `audio/core/SynthesisCore.ts`: el avance rápido y `SYNTHESIS_VERSION`.
  - `audio/worklet/workletContract.ts` y `synthesizer.worklet.ts`: la opción `startAtS`.
  - `audio/engine/AudioEngine.ts`: la semilla y el punto de partida.
  - `audio/ui/PlaybackPanel.tsx`: semilla fija y aviso de la semilla usada.
- **Datos:**
  - `records/historyDatabase.ts`: la versión 3.
  - `records/listeningBackup.ts` y `ListeningBackupPanel.tsx`: la copia versión 2.
  - `cloud/cloudApi.ts`: rutas de melodías.
  - `cloud/accountStorage.ts`: la cola de melodías al borrar la cuenta.
- **Inicio y perfil:** `home/HomePage.tsx`, `home/exploreCatalog.ts`, `home.css` y `account/AccountPage.tsx` (el acceso «Melodías guardadas · Ver»).
- **«Lo último que sonó»:** `listen/lastPiece.ts` (`sessionStorage` por cuenta), que se borra al cerrar sesión.
- **Pulso en vivo:** `session/SessionPage.tsx`, `ArrivalSlide.tsx`, `SessionStage.tsx`, `session.css` y `adaptation/AdaptationEngine.ts`.
- **Estilos y demostración:** `src/index.css` (tokens nuevos, si hacen falta) y `scripts/demo/buildDemoBackup.ts`.
- **Documentación:** `pantallas.md`, `decisiones.md` (ADR-66) y `PROGRESS.md`.

**Back, nuevos o cambian:**

- La migración `supabase/migrations/20261117000000_melodies.sql` y su prueba SQL.
- `app/routes/melodies.py`, los esquemas de `app/schemas.py`, las constantes de catálogo en `app/constants.py` y el registro en `app/factory.py`.
- `tests/test_melodies.py` y el README del back.

---

## 5. Pruebas y verificación

**Unitarias (Vitest):**

- **Sintetizador:**
  - Misma semilla, mismo instrumento y mismo paso dan las mismas muestras.
  - Avanzar hasta el minuto *m* da las mismas notas que oír la pieza entera desde el principio.
- **Validación de melodías:** catálogos, rangos, nombre y versión.
- **Almacén:**
  - Separación por cuenta y tope de 50.
  - Migración de la base de la versión 2 a la 3, conservando sesiones y borradores.
- **Sincronización:**
  - Combinar listas, quedarse con la más reciente y la cola sin red.
  - Una API sin la ruta, `409 limit_reached` y borrar la cuenta.
- **Copia de seguridad:** la versión 2 y la versión 1.
- **`livePulse.ts`:** intervalos a pulso, ventana de un minuto, valores fuera de rango, reloj solo pulso y el avance de la referencia.
- **Componentes:** `ListenPage` (pestañas, reproducir, guardar, renombrar, borrar y retomar) y `LivePulse`.

**Back:** pytest de las tres rutas (sin cuenta 401, otra cuenta 404, esquema cerrado, tope 409 e idempotencia), `ruff` y la migración con Docker.

**E2E en Chrome y Edge:**

- `listen.spec.ts`: entrar desde la barra y desde Inicio, reproducir, guardar, recargar, retomar desde el minuto guardado, borrar y detener con Esc.
- `session.spec.ts`: el pulso en vivo y el avance de la referencia con el simulador.

**Diseño en PC y celular:**

- Capturas con Playwright a 1366, 1024, 768, 390 y 360 px, en tema claro y oscuro, de:
  - `/listen` en cada estado: vacía, sonando, con melodías y con el diálogo de guardar.
  - Inicio con la entrada nueva.
  - El menú del celular con cinco entradas.
  - Las dos diapositivas con el pulso en vivo.
- En cada captura compruebo:
  - que no haya desborde horizontal;
  - que no haya dos barras fijas a la vez;
  - que Detener no tape contenido;
  - que las áreas táctiles midan al menos 44 px.
- Además, `e2e/visual.spec.ts`, porque cambian la navegación e Inicio.

**Audio:** `test:audio`, porque esta vez sí cambia el sintetizador (el avance rápido).

**Antes de pedirte publicar:**

- Front: `typecheck`, `lint`, `vitest run`, `build` y los E2E afectados.
- Back: `pytest --cov` y `ruff check .`.

**No lo puedo verificar yo:**

- Cómo suena cada combinación, y que la melodía retomada suene igual al oído.
- La nube real, hasta que apliques la migración.
- El teléfono con la pantalla bloqueada (P-08 sigue abierto).

---

## 6. Commits en `dev`, con tu autoría

**Back:**

1. `feat(melodies): store saved melodies per account`

**Front:**

1. `feat(session): show the live pulse and the reference progress`
2. `feat(audio): start a saved melody from where it was saved`
3. `feat(listen): add the listening screen with saved melodies`
4. `docs: record the listening screen and the live pulse as ADR-66`

Nada se sube a GitHub hasta que lo pidas.

---

## 7. Decisiones

| # | Decisión | Elegida |
|---|---|---|
| 1 | ¿Escuchar usa el pulso? | No, y ofrece «Haz una sesión con este sonido» (usuario) |
| 2 | ¿Dónde se guardan las melodías? | Dispositivo y nube desde el principio, sin `aal2` (usuario) |
| 3 | ¿Retomar desde el minuto guardado? | Sí, con el avance rápido del sintetizador (usuario) |
| 4 | ¿Las escuchas cuentan en el historial o el progreso? | No; solo quedan las melodías guardadas (recomendado, aceptado) |
| 5 | ¿La música sigue al cambiar de pantalla? | No; se detiene al salir y queda en pausa como «Lo último que sonó» (recomendado, aceptado) |
| 6 | ¿El pulso en vivo sigue tras la referencia? | Sí, más bajo (recomendado, aceptado) |
| 7 | ¿Duraciones de Escuchar? | 15, 30, 45 y 60 minutos, en el reproductor (recomendado, aceptado) |
| 8 | ¿Mis melodías es una sección aparte? | No: segunda pestaña de Escuchar (`?tab=melodies`), con accesos desde Inicio y el perfil (§2.8) |
