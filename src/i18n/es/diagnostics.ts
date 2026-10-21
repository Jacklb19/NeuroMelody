/** Spanish copy of the platform diagnostics screen (ADR-25). */
export const diagnostics = {
  pageTitle: 'Diagnóstico de la plataforma',
  eyebrow: 'Herramienta técnica',
  introduction:
    'Verifica la configuración base del entorno, cabeceras de aislamiento y capacidades del navegador.',
  capabilitiesHeading: 'Capacidades detectadas en tiempo de ejecución',
  /** Name and purpose of each checked capability; keys mirror `CapabilityId`. */
  capabilities: {
    crossOriginIsolated: {
      label: 'Aislamiento de origen cruzado (crossOriginIsolated)',
      description: 'Indica si las cabeceras COOP y COEP están activas y habilitan memoria compartida.',
    },
    supportsWorkers: {
      label: 'Soporte de Web Workers',
      description: 'Permite delegar tareas de cómputo en segundo plano sin congelar la interfaz.',
    },
    supportsWebAssembly: {
      label: 'Soporte de WebAssembly',
      description: 'Habilita la ejecución de módulos compilados de alto rendimiento en el cliente.',
    },
    supportsSharedArrayBuffer: {
      label: 'Soporte de SharedArrayBuffer',
      description: 'Permite compartir memoria entre hilos sin copias estructuradas.',
    },
  },
  available: 'Disponible',
  unavailable: 'No disponible',
  audio: {
    title: 'Prueba de audio con la pantalla bloqueada',
    introduction: (minutes: number): string => `Compara variantes con la misma música. Cada prueba dura como máximo ${String(minutes)} minutos y se apaga sola.`,
    steps: [
      'Deja todo como está e inicia la música, sin conectar la cámara.',
      'Escucha unos segundos, bloquea el teléfono unos 30 segundos y desbloquéalo. Fíjate si oíste cortes.',
      'Detén la prueba y descarga el registro.',
      'Repite cambiando una sola cosa cada vez: la salida alternativa, sin reverberación, sin ambiente y la latencia «interactiva». Anota en cuáles oíste cortes.',
    ],
    settings: 'Qué vas a comparar',
    output: 'Salida de audio',
    outputs: { direct: 'Salida actual', media: 'Salida alternativa con reproductor' },
    reverb: 'Reverberación',
    reverbs: { on: 'Con reverberación (como en la sesión)', off: 'Sin reverberación' },
    latency: 'Latencia pedida al navegador',
    latencies: { playback: 'Para escuchar (como en la sesión)', balanced: 'Equilibrada', interactive: 'Interactiva' },
    preparing: 'Preparando la variante…',
    context: 'Último estado del audio',
    contextStates: { running: 'En ejecución', suspended: 'En pausa', interrupted: 'Interrumpido', closed: 'Cerrado' },
    time: 'Reloj de audio (segundos)',
    underruns: 'Cortes registrados por el navegador',
    baseLatency: 'Latencia interna (ms)',
    outputLatency: 'Latencia de salida (ms)',
    /** Audio clock against wall clock, as a percentage: 100 % is real time. */
    pace: (percent: string): string => `${percent} %`,
    paceVisible: 'Ritmo del audio con la pantalla encendida',
    paceHidden: 'Ritmo del audio con la pantalla bloqueada',
    slowestHidden: 'Tramo más lento con la pantalla bloqueada',
    entries: 'Lecturas del registro',
    unavailable: 'Sin medición disponible',
    directCaveat: 'El contador describe la salida actual si el navegador lo ofrece. Oír la prueba sigue siendo necesario.',
    mediaCaveat: 'En la salida alternativa el contador no mide el último tramo que llega al altavoz. Un cero aquí no demuestra que no haya cortes.',
    download: 'Descargar registro de audio',
    privacy: 'El registro contiene estados del audio, contadores, sonido, ambiente y versión del navegador. Se queda en este dispositivo; no incluye latidos, imágenes ni datos de tu cuenta. La prueba no se guarda en tu historial.',
  },
  recheckHeading: 'Verificación de Reactividad',
  checksDone: 'Verificaciones realizadas:',
  recheck: 'Reevaluar capacidades',
};
