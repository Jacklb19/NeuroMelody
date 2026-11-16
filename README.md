# NeuroMelody · Frontend

Aplicación web progresiva que genera música de forma continua en el navegador y modula sus parámetros (tempo, tonalidad, densidad, brillo y reverberación) en tiempo real a partir de la frecuencia cardíaca y la variabilidad entre latidos. El pulso llega de una banda o un reloj Bluetooth de bajo consumo, de la cámara del celular (experimental), de un simulador o de registros de ejemplo.

> **Aviso.** NeuroMelody es una herramienta de bienestar y acompañamiento. **No es un dispositivo médico**: no mide el dolor, no diagnostica, no interpreta clínicamente la señal y no sustituye ni modifica ningún tratamiento prescrito. Su uso es complementario al seguimiento de un profesional de la salud.

Proyecto de la asignatura Programación Orientada a la Web. La API vive en un repositorio aparte: [NeuroM_Back](https://github.com/Jacklb19/NeuroM_Back).

| | |
|---|---|
| Aplicación publicada | <https://neruomelody.vercel.app> |
| API publicada | <https://neuro-m-back.vercel.app/v1/health> |
| Especificación | [`docs/definicion-proyecto.md`](docs/definicion-proyecto.md) |
| Decisiones técnicas | [`docs/decisiones.md`](docs/decisiones.md) |

## Cuenta de demostración

La app solo se usa con cuenta (ADR-57). Para revisarla sin registrarse:

| Campo | Valor |
|---|---|
| Correo | _(por completar)_ |
| Contraseña | _(por completar)_ |

Con la biblioteca de demostración cargada en esa cuenta (ver «Datos de demostración»), el historial, el progreso y el informe muestran datos inventados. Para la sesión basta el simulador: «No tengo cómo medir mi pulso: probar la app». El recorrido sugerido está en [`docs/demo.md`](docs/demo.md).

## Arquitectura en breve

El lazo de control se cierra íntegramente en el dispositivo; la API solo aporta identidad, persistencia y el modelo de lenguaje.

Sin sesión iniciada solo son públicas la portada, las pantallas de acceso, la privacidad y la página no encontrada. Las sesiones se guardan primero en el dispositivo (IndexedDB) y, con el segundo factor y el consentimiento, se sincronizan con la nube.

| Etapa | Contexto de ejecución | Tecnología |
|---|---|---|
| Adquisición | Hilo principal, tras una interfaz común de fuente de señal | Web Bluetooth, cámara, simulador o registros |
| Análisis | Web Worker | Filtrado, índices temporales y espectro LF/HF |
| Decisión | Motor de adaptación con histéresis y rampas | TypeScript y un clasificador entrenado con WESAD (`public/models/`) |
| Síntesis | Hilo de audio de tiempo real | AudioWorklet, Web Audio API |
| Interfaz | Hilo principal | React 19, TypeScript 6, Vite 8, React Router |
| API | Repositorio y proyecto de Vercel aparte | FastAPI (Python 3.13) |
| Identidad y datos | Supabase | Auth, PostgreSQL con RLS |
| Modelo de lenguaje | Solo desde la API | Groq con `openai/gpt-oss-20b` (ADR-08) |

Antes de cada sesión la persona elige qué busca (relajarse, dormir, recuperar la calma, respirar o una pausa), cuánto tiempo, el sonido y si quiere lluvia, mar o viento de fondo; esa intención decide en qué escalón empieza la música y hasta dónde baja, y el tempo parte de su propio pulso. En el perfil puede crear un recordatorio para su calendario.

«Tu progreso» también compara elecciones del historial local con mínimos de datos, sin atribuirles efectos. «Para ti» permite aceptar opciones respaldadas por las valoraciones, cada una por separado. Hay notas privadas en el resumen y una entrada de 3 minutos desde Inicio; esa sesión rápida conserva la calibración normal y puede acabar antes de una estimación adaptada.

El modelo de lenguaje nunca participa en el lazo de control: propone la duración del plan y redacta el resumen final, marcado siempre como texto generado automáticamente. Con consentimiento también puede elegir una explicación del progreso entre frases verificadas, manteniendo las cifras calculadas en el dispositivo.

## Requisitos

- Node.js 24 (versión exacta en `.nvmrc`) y npm.
- Un proyecto de Supabase y la API en marcha (local o publicada): la app pide una cuenta.
- Chrome o Edge (escritorio o Android) para Bluetooth; el resto de navegadores funcionan con el simulador o la cámara.

## Puesta en marcha

```bash
npm ci
cp .env.example .env.local   # completar los valores locales
npm run dev                  # http://localhost:5173
```

| Variable | Contenido |
|---|---|
| `VITE_SUPABASE_URL` | URL del proyecto de Supabase. |
| `VITE_SUPABASE_ANON_KEY` | Clave pública del proyecto. No es un secreto: todas las tablas tienen RLS. |
| `VITE_API_BASE_URL` | URL de la API, por ejemplo `http://127.0.0.1:8000` o `https://neuro-m-back.vercel.app`. |

Las variables con prefijo `VITE_` se incrustan en el cliente; ningún secreto lleva ese prefijo. Las claves de servicio y del modelo de lenguaje viven solo en el backend. La página `/diagnostics` muestra si el entorno tiene aislamiento de origen cruzado y las capacidades necesarias.

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo con las cabeceras de aislamiento |
| `npm run build` | Verificación de tipos y construcción de producción en `dist/` |
| `npm run preview` | Sirve la construcción de producción (http://localhost:4173) |
| `npm run typecheck` | Verificación de tipos |
| `npm run lint` | Análisis estático con ESLint (`strictTypeChecked`) |
| `npm test` | Pruebas unitarias con Vitest |
| `npm run test:coverage` | Pruebas con umbral de cobertura (70 %) |
| `npm run test:e2e` | Recorridos de navegador en Chrome y Edge |
| `npm run test:audio` | Continuidad de audio durante 60 s en Chrome (`playbackStats`) |
| `npm run recordings:extract` | Regenera los extractos nsr2db y verifica sus SHA-256 |
| `node scripts/audio/renderSamples.ts <etiqueta>` | Renderiza el sintetizador a archivos WAV en `audio-samples/<etiqueta>/` para oír un cambio antes de integrarlo |

## Pruebas

```bash
npm run typecheck && npm run lint
npm run test:coverage
npx playwright install chrome msedge   # una sola vez, para los recorridos
npm run test:e2e
npm run test:audio
```

Los recorridos E2E construyen la app y la sirven con la API y la cuenta simuladas, así que no necesitan Supabase ni la API. Para comprobar 30 minutos de audio sin cortes: `AUDIO_LONG=1 npm run test:audio` (en PowerShell, `$env:AUDIO_LONG='1'` antes del comando). También existe el workflow manual «Continuidad de audio (30 minutos)».

La integración continua (`.github/workflows/ci.yml`) ejecuta en cada push y pull request `npm audit --omit=dev`, tipos, lint, las pruebas unitarias con cobertura, la construcción, los recorridos en Chrome y Edge y la continuidad de audio. Estado al 15 nov 2026: 896 pruebas unitarias en 117 archivos, cobertura de líneas del 84,7 % y ninguna vulnerabilidad conocida en las dependencias de producción.

## Datos de demostración

Para mostrar el historial, el progreso y el informe con datos, se puede generar una biblioteca inventada de seis semanas (36 sesiones con sus muestras, valoraciones, notas y dos favoritos) para una cuenta concreta:

```bash
node scripts/demo/buildDemoBackup.ts <id de la cuenta> neuromelody-demo-backup.json
```

El id es el UUID de la cuenta en Supabase (*Authentication → Users*). El archivo se carga desde la app en **Perfil → Copia de seguridad → Restaurar**, y la app lo rechaza en cualquier otra cuenta. Ningún dato procede de una persona.

## Sin conexión

El service worker se genera solo en el build de producción: `npm run build` y luego `npm run preview` (`npm run dev` no lo registra). Guarda la aplicación, los módulos de audio, el Worker de señal y los registros de ejemplo, nunca peticiones a la API ni datos personales.

## Estructura

```text
src/
  app/             rutas, diseño común, errores por pantalla y service worker
  config/          configuración pública, rutas y valores de la PWA
  features/        una carpeta por característica (componente, lógica y pruebas juntas):
                   acquisition, signal, adaptation y audio forman el lazo de control;
                   account, cloud, records, history, progress, report y summary, los datos
  i18n/            textos de la interfaz en español e inglés
  shared/          componentes y utilidades compartidas
  test/            configuración y dobles de prueba
e2e/               recorridos de navegador con Playwright
scripts/           extractos de registros, renderizado de audio, PWA y datos de demostración
public/models/     clasificador entrenado que usa la app
public/recordings/ extractos nsr2db (créditos en CREDITS.md)
docs/              especificación, decisiones, plan y guías
vercel.json        reescrituras y cabeceras de seguridad y aislamiento
```

## Datos y privacidad

El esquema y sus migraciones viven en el repositorio del backend ([NeuroM_Back](https://github.com/Jacklb19/NeuroM_Back)), con seguridad a nivel de fila (RLS) en todas las tablas. La señal de una sesión nunca sale del dispositivo: a la nube solo viajan, con segundo factor y consentimiento, el resumen de la sesión y sus indicadores agregados. Las grabaciones guiadas de `/collect`, que sí contienen latidos, solo se envían si la persona lo decide, para reentrenar el clasificador, y puede retirarlas cuando quiera (ADR-37).

## Despliegue

- Vercel (plan Hobby) publica `main` en producción y cada rama en una vista previa; Supabase (plan Free). Sin costo.
- Variables del proyecto de Vercel: las tres de la tabla de «Puesta en marcha».
- `vercel.json` define la CSP: si cambia la URL de Supabase o de la API, hay que actualizar `connect-src` e `img-src`. También fija COOP/COEP: el aislamiento de origen cruzado habilita `SharedArrayBuffer`, que usa la telemetría del motor de audio.
- El origen del frontend debe figurar en `ALLOWED_ORIGINS` de la API.

## Documentación

| Documento | Contenido |
|---|---|
| [`definicion-proyecto.md`](docs/definicion-proyecto.md) | Especificación previa a la construcción (26 sep 2026): problema, requisitos, arquitectura y ADR-01 a ADR-06. Se conserva tal cual; donde difiere, prevalece `decisiones.md` (por ejemplo, ADR-08: Groq en lugar de Gemini; ADR-57: la app solo se usa con cuenta) |
| [`decisiones.md`](docs/decisiones.md) | ADR-07 a ADR-67: lo que completa o cambia la especificación |
| [`plan-entrega.md`](docs/plan-entrega.md) | Bloques de trabajo y estado de cada requisito |
| [`pantallas.md`](docs/pantallas.md) | Mapa de pantallas y de su contenido |
| [`diseno-musical.md`](docs/diseno-musical.md) | Niveles musicales y reglas de transición |
| [`diseno-visual.md`](docs/diseno-visual.md) | Dirección visual |
| [`modelo.md`](docs/modelo.md) | Ficha del clasificador de activación |
| [`fuentes-de-pulso.md`](docs/fuentes-de-pulso.md) | Sensores que sirven y por qué |
| [`prueba-ble.md`](docs/prueba-ble.md) | Prueba manual de Bluetooth con nRF Connect |
| [`contrato-progress-summary.md`](docs/contrato-progress-summary.md) | Contrato de `POST /v1/progress/summary` |
| [`contrato-melodies.md`](docs/contrato-melodies.md) | Contrato de `/v1/melodies` y de su sincronización (ADR-66) |
| [`plan-escuchar.md`](docs/plan-escuchar.md) | Definición de Escuchar, las melodías y el pulso en vivo, con su flujo de navegación (ADR-66) |
| [`demo.md`](docs/demo.md) | Guion de demostración |

## Ramas

- `main`: versión estable; Vercel la publica en producción.
- `dev`: integración diaria.
- `feat/…`, `fix/…`, `docs/…`, `chore/…`: ramas cortas desde `dev`, que vuelven por pull request.

## Licencia

MIT. Ver [LICENSE](LICENSE).
