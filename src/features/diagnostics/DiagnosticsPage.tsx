import { useState, useId } from 'react';
import { usePageTitle } from '../../app/usePageTitle';
import { checkCapabilities } from './checkCapabilities';
import type { EnvironmentCapabilities } from './diagnostics.types';
import { PageHeading } from '../../shared/PageHeading';
import { CameraPulsePanel } from './CameraPulsePanel';

export function DiagnosticsPage(): React.JSX.Element {
  usePageTitle('Diagnóstico de la plataforma');
  const [capabilities, setCapabilities] = useState<EnvironmentCapabilities>(() =>
    checkCapabilities(),
  );
  const [checkCounter, setCheckCounter] = useState<number>(0);
  const listId = useId();

  const handleRecheck = (): void => {
    setCapabilities(checkCapabilities());
    setCheckCounter((prev) => prev + 1);
  };

  const items = [
    {
      label: 'Aislamiento de origen cruzado (crossOriginIsolated)',
      description:
        'Indica si las cabeceras COOP y COEP están activas y habilitan memoria compartida.',
      available: capabilities.crossOriginIsolated,
    },
    {
      label: 'Soporte de Web Workers',
      description:
        'Permite delegar tareas de cómputo en segundo plano sin congelar la interfaz.',
      available: capabilities.supportsWorkers,
    },
    {
      label: 'Soporte de WebAssembly',
      description:
        'Habilita la ejecución de módulos compilados de alto rendimiento en el cliente.',
      available: capabilities.supportsWebAssembly,
    },
    {
      label: 'Soporte de SharedArrayBuffer',
      description:
        'Permite compartir memoria entre hilos sin copias estructuradas.',
      available: capabilities.supportsSharedArrayBuffer,
    },
  ];

  return (
    <div className="diagnostics-page">
      <PageHeading eyebrow="Herramienta técnica" title="Diagnóstico de la plataforma">
        <p>
          Verifica la configuración base del entorno,
          cabeceras de aislamiento y capacidades del navegador.
        </p>
      </PageHeading>

      <section
        aria-labelledby={listId}
        className="capabilities-section"
      >
        <h2 id={listId}>
          Capacidades detectadas en tiempo de ejecución
        </h2>

        <ul className="capabilities-list">
          {items.map((item) => (
            <li
              key={item.label}
            >
              <div>
                <strong>{item.label}</strong>
                <span>
                  {item.description}
                </span>
              </div>
              <span
                role="status"
                className={item.available ? 'capability-status available' : 'capability-status unavailable'}
              >
                {item.available ? 'Disponible' : 'No disponible'}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <CameraPulsePanel />

      <section className="recheck-section">
        <h2>
          Verificación de Reactividad
        </h2>
        <p>
          Verificaciones realizadas:{' '}
          <strong data-testid="check-counter">{checkCounter}</strong>
        </p>
        <button
          type="button"
          className="button button-primary"
          onClick={handleRecheck}
        >
          Reevaluar capacidades
        </button>
      </section>
    </div>
  );
}
