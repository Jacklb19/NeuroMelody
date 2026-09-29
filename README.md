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
