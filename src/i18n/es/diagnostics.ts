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
  recheckHeading: 'Verificación de Reactividad',
  checksDone: 'Verificaciones realizadas:',
  recheck: 'Reevaluar capacidades',
};
