# NeuroMelody

Aplicación web progresiva que genera música de forma continua en el navegador y modula sus parámetros (tempo, tonalidad, densidad, brillo y reverberación) en tiempo real a partir de la frecuencia cardíaca y la variabilidad entre latidos, captadas con una banda Bluetooth de bajo consumo o con un simulador.

> **Aviso.** NeuroMelody es una herramienta de bienestar y acompañamiento. **No es un dispositivo médico** ni está certificada como tal: no mide el dolor, no diagnostica, no interpreta clínicamente la señal y no sustituye ni modifica ningún tratamiento prescrito. Su uso es complementario al seguimiento de un profesional de la salud.

Proyecto de la asignatura Programación Orientada a la Web.

## Arquitectura en breve

El lazo de control se cierra íntegramente en el dispositivo; la nube solo aporta identidad, persistencia y apoyo:

| Etapa | Contexto de ejecución | Tecnología |
|---|---|---|
| Adquisición | Hilo principal, tras una interfaz común de fuente de señal | Web Bluetooth o simulador |
| Análisis y clasificación | Web Worker | Índices de variabilidad, ONNX Runtime Web |
| Decisión | Motor de adaptación con histéresis y rampas | TypeScript |
| Síntesis | Hilo de audio de tiempo real | AudioWorklet, Web Audio API |
| Interfaz | Hilo principal | React 19, TypeScript, Vite |
| API | Funciones de Vercel | FastAPI (Python) |
| Identidad y datos | Supabase | Auth, PostgreSQL con RLS, Storage |

El modelo de lenguaje nunca participa en el lazo de control: solo propone el plan inicial y redacta el resumen final, marcado siempre como texto generado automáticamente.

La memoria compartida entre hilos exige aislamiento de origen cruzado, por eso las cabeceras COOP y COEP (junto con la CSP y HSTS) se declaran en `vercel.json` y también en el servidor de desarrollo de Vite.

## Requisitos

- Node.js 24 (ver `.nvmrc`).
- Chrome o Edge (escritorio o Android) para la función Bluetooth; el resto de navegadores funcionan con el simulador.

## Puesta en marcha

```bash
npm ci
cp .env.example .env.local   # completar los valores locales
npm run dev
```

La página de diagnóstico inicial muestra si el entorno tiene aislamiento de origen cruzado, Web Workers, WebAssembly y `SharedArrayBuffer`.

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo con las cabeceras de aislamiento |
| `npm run build` | Verificación de tipos y construcción de producción en `dist/` |
| `npm run preview` | Sirve la construcción de producción |
| `npm run typecheck` | Verificación de tipos de TypeScript |
| `npm run lint` | Análisis estático con ESLint |
| `npm test` | Pruebas unitarias con Vitest |
| `npm run test:coverage` | Pruebas con informe y umbral de cobertura (70 %) |
| `npm run test:e2e` | Recorridos de sesión y funcionamiento sin conexión en Chrome y Edge |
| `npm run test:audio` | Continuidad real durante 60 segundos en Chrome con `playbackStats` |
| `npm run recordings:extract` | Regenera los dos extractos nsr2db y verifica sus SHA-256 |

## Verificación del S3

La sesión permite elegir simulador o dos registros públicos de 30 minutos. Los
datos y su licencia se describen en `public/recordings/CREDITS.md`. La música
permanece en el nivel inicial; la adaptación automática se incorpora en S4.

El service worker se genera solo en el build de producción y guarda la aplicación,
los módulos de audio, el Worker de señal y los registros. Para probarlo se usa
`npm run build` seguido de `npm run preview`; `npm run dev` no registra el worker.
La actualización espera a que termine el uso de la versión anterior, para no
reemplazar los recursos de una sesión activa. No se guardan peticiones API ni
datos personales en esta caché. La persistencia y sincronización de sesiones
pertenecen a los sprints posteriores.

Las pruebas de navegador usan las instalaciones locales de Chrome y Edge.
En CI se instalan con `npx playwright install --with-deps chrome msedge`.
Los informes y las muestras de `playbackStats` quedan en `test-results/` y
`playwright-report/`, excluidos del repositorio.

Para verificar 30 minutos sin acelerar el reloj de audio, en PowerShell:

```powershell
$env:AUDIO_LONG = '1'
npm run test:audio
Remove-Item Env:AUDIO_LONG
```

En Bash: `AUDIO_LONG=1 npm run test:audio`. También existe el workflow manual
"Continuidad de audio (30 minutos)". Una API `playbackStats` ausente produce
un fallo explícito, no una aprobación. El resultado automatizado valida el
contexto de audio de ese navegador y equipo; la escucha, los controles del
sistema y la accesibilidad con lector de pantalla requieren revisión manual.

## Estructura

```
src/
  features/        una carpeta por característica (componente, lógica y pruebas juntas)
  shared/          utilidades compartidas entre características
  test/            configuración de pruebas y auditorías transversales
supabase/
  migrations/      esquema de la base de datos como migraciones SQL
vercel.json        reescrituras y cabeceras de seguridad y aislamiento
```

## Base de datos

El esquema vive en `supabase/migrations/`: `profiles`, `plans`, `sessions`, `session_metrics` y `model_versions`. Todas las tablas tienen seguridad a nivel de fila (RLS), y una prueba automatizada comprueba que cada `CREATE TABLE` tenga su `ENABLE ROW LEVEL SECURITY`. Solo se guardan indicadores agregados; la señal fisiológica cruda nunca sale del dispositivo.

## Configuración y secretos

Las variables se documentan en `.env.example`, solo con sus nombres. Las que llevan el prefijo `VITE_` se incrustan en el cliente; la clave de servicio de Supabase y la del modelo de lenguaje existen solo en el servidor (variables de entorno de Vercel) y nunca se versionan.

## Despliegue

Vercel (plan Hobby) y Supabase (plan Free), sin costo. Cada push a GitHub genera un despliegue de vista previa, y cada integración en `main` se publica en producción.
