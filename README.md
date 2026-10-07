# NeuroMelody · Frontend

Aplicación web progresiva que genera música de forma continua en el navegador y modula sus parámetros (tempo, tonalidad, densidad, brillo y reverberación) en tiempo real a partir de la frecuencia cardíaca y la variabilidad entre latidos, captadas con una banda Bluetooth de bajo consumo, un simulador o registros de ejemplo.

> **Aviso.** NeuroMelody es una herramienta de bienestar y acompañamiento. **No es un dispositivo médico**: no mide el dolor, no diagnostica, no interpreta clínicamente la señal y no sustituye ni modifica ningún tratamiento prescrito. Su uso es complementario al seguimiento de un profesional de la salud.

Proyecto de la asignatura Programación Orientada a la Web. La API vive en un repositorio aparte: [NeuroM_Back](https://github.com/Jacklb19/NeuroM_Back).

## Arquitectura en breve

El lazo de control se cierra íntegramente en el dispositivo; la API solo aporta identidad, persistencia y el modelo de lenguaje.

| Etapa | Contexto de ejecución | Tecnología |
|---|---|---|
| Adquisición | Hilo principal, tras una interfaz común de fuente de señal | Web Bluetooth, simulador o registros |
| Análisis | Web Worker | Filtrado, índices temporales y espectro LF/HF |
| Decisión | Motor de adaptación con histéresis y rampas | TypeScript |
| Síntesis | Hilo de audio de tiempo real | AudioWorklet, Web Audio API |
| Interfaz | Hilo principal | React 19, TypeScript, Vite |
| API | Repositorio y proyecto de Vercel aparte | FastAPI (Python) |
| Identidad y datos | Supabase | Auth, PostgreSQL con RLS |

El modelo de lenguaje nunca participa en el lazo de control: solo propone el plan inicial y redacta el resumen final, marcado siempre como texto generado automáticamente. Las decisiones técnicas están en [`docs/decisiones.md`](docs/decisiones.md) y la especificación completa en [`docs/definicion-proyecto.md`](docs/definicion-proyecto.md).

## Requisitos

- Node.js 24 (ver `.nvmrc`).
- Chrome o Edge (escritorio o Android) para la función Bluetooth; el resto de navegadores funcionan con el simulador.

## Puesta en marcha

```bash
npm ci
cp .env.example .env.local   # completar los valores locales
npm run dev
```

La página `/diagnostics` muestra si el entorno tiene aislamiento de origen cruzado y las capacidades necesarias.

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo con las cabeceras de aislamiento |
| `npm run build` | Verificación de tipos y construcción de producción en `dist/` |
| `npm run preview` | Sirve la construcción de producción |
| `npm run typecheck` | Verificación de tipos |
| `npm run lint` | Análisis estático con ESLint |
| `npm test` | Pruebas unitarias con Vitest |
| `npm run test:coverage` | Pruebas con umbral de cobertura (70 %) |
| `npm run test:e2e` | Recorridos de navegador en Chrome y Edge |
| `npm run test:audio` | Continuidad de audio durante 60 s en Chrome (`playbackStats`) |
| `npm run recordings:extract` | Regenera los extractos nsr2db y verifica sus SHA-256 |

Para comprobar 30 minutos de audio sin cortes: `AUDIO_LONG=1 npm run test:audio` (en PowerShell, `$env:AUDIO_LONG='1'` antes del comando). También existe el workflow manual «Continuidad de audio (30 minutos)».

## Sin conexión

El service worker se genera solo en el build de producción: `npm run build` y luego `npm run preview` (`npm run dev` no lo registra). Guarda la aplicación, los módulos de audio, el Worker de señal y los registros de ejemplo, nunca peticiones a la API ni datos personales.

## Estructura

```
src/
  features/        una carpeta por característica (componente, lógica y pruebas juntas)
  shared/          utilidades compartidas
  test/            configuración y dobles de prueba
e2e/               pruebas de navegador con Playwright
public/recordings/ extractos nsr2db (créditos en CREDITS.md)
docs/              especificación, decisiones, plan y guías
vercel.json        reescrituras y cabeceras de seguridad y aislamiento
```

## Base de datos

El esquema y sus migraciones viven en el repositorio del backend ([NeuroM_Back](https://github.com/Jacklb19/NeuroM_Back)), con seguridad a nivel de fila (RLS) en todas las tablas. Solo se guardan indicadores agregados; la señal cruda nunca sale del dispositivo.

## Configuración y secretos

Las variables se documentan en `.env.example`, solo con sus nombres. Las que llevan el prefijo `VITE_` se incrustan en el cliente; ningún secreto lleva ese prefijo. Las claves de servicio viven solo en el backend.

## Ramas y despliegue

- `main`: versión estable; Vercel la publica en producción.
- `dev`: integración diaria.
- `feat/…`, `fix/…`, `docs/…`, `chore/…`: ramas cortas desde `dev`, que vuelven por pull request.

Vercel (plan Hobby) y Supabase (plan Free), sin costo.
