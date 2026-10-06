import { useState, useId } from 'react';
import { usePageTitle } from '../../app/usePageTitle';
import { checkCapabilities } from './checkCapabilities';
import type { EnvironmentCapabilities } from './diagnostics.types';

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
    <>
      <header style={{ marginBottom: 'var(--space-8)' }}>
        <h1 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-2)' }}>
          Diagnóstico de la plataforma
        </h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Verifica la configuración base del entorno,
          cabeceras de aislamiento y capacidades del navegador.
        </p>
      </header>

      <section
        aria-labelledby={listId}
        style={{
          border: 'var(--border-width) solid var(--color-border)',
          borderRadius: 'var(--border-radius)',
          padding: 'var(--space-6)',
          marginBottom: 'var(--space-8)',
        }}
      >
        <h2 id={listId} style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-4)' }}>
          Capacidades detectadas en tiempo de ejecución
        </h2>

        <ul style={{ listStyle: 'none', display: 'grid', gap: 'var(--space-4)' }}>
          {items.map((item) => (
            <li
              key={item.label}
              style={{
                padding: 'var(--space-3)',
                border: 'var(--border-width) solid var(--color-border-subtle)',
                borderRadius: 'var(--border-radius)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 'var(--space-4)',
              }}
            >
              <div>
                <strong style={{ display: 'block' }}>{item.label}</strong>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                  {item.description}
                </span>
              </div>
              <span
                role="status"
                style={{
                  fontWeight: 'var(--font-weight-strong)',
                  padding: 'var(--space-1) var(--space-2)',
                  borderRadius: 'var(--border-radius)',
                  backgroundColor: item.available ? 'var(--color-success-background)' : 'var(--color-error-background)',
                  color: item.available ? 'var(--color-success-text)' : 'var(--color-error-text)',
                  fontSize: 'var(--text-sm)',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.available ? 'Disponible' : 'No disponible'}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section
        style={{
          border: 'var(--border-width) solid var(--color-border)',
          borderRadius: 'var(--border-radius)',
          padding: 'var(--space-6)',
        }}
      >
        <h2 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-4)' }}>
          Verificación de Reactividad
        </h2>
        <p style={{ marginBottom: 'var(--space-4)', color: 'var(--color-text-secondary)' }}>
          Verificaciones realizadas:{' '}
          <strong data-testid="check-counter">{checkCounter}</strong>
        </p>
        <button
          type="button"
          onClick={handleRecheck}
          style={{
            padding: 'var(--space-2) var(--space-4)',
            backgroundColor: 'var(--color-button-background)',
            color: 'var(--color-button-text)',
            border: 'none',
            borderRadius: 'var(--border-radius)',
            cursor: 'pointer',
            fontSize: 'var(--text-base)',
          }}
        >
          Reevaluar capacidades
        </button>
      </section>
    </>
  );
}
