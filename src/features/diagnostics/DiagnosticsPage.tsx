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
      <header style={{ marginBottom: 'var(--espacio-8)' }}>
        <h1 style={{ fontSize: 'var(--texto-2xl)', marginBottom: 'var(--espacio-2)' }}>
          Diagnóstico de la plataforma
        </h1>
        <p style={{ color: 'var(--color-texto-secundario)' }}>
          Verifica la configuración base del entorno,
          cabeceras de aislamiento y capacidades del navegador.
        </p>
      </header>

      <section
        aria-labelledby={listId}
        style={{
          border: 'var(--borde-grosor) solid var(--color-borde)',
          borderRadius: 'var(--radio-borde)',
          padding: 'var(--espacio-6)',
          marginBottom: 'var(--espacio-8)',
        }}
      >
        <h2 id={listId} style={{ fontSize: 'var(--texto-xl)', marginBottom: 'var(--espacio-4)' }}>
          Capacidades detectadas en tiempo de ejecución
        </h2>

        <ul style={{ listStyle: 'none', display: 'grid', gap: 'var(--espacio-4)' }}>
          {items.map((item) => (
            <li
              key={item.label}
              style={{
                padding: 'var(--espacio-3)',
                border: 'var(--borde-grosor) solid var(--color-borde-suave)',
                borderRadius: 'var(--radio-borde)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 'var(--espacio-4)',
              }}
            >
              <div>
                <strong style={{ display: 'block' }}>{item.label}</strong>
                <span style={{ fontSize: 'var(--texto-sm)', color: 'var(--color-texto-tenue)' }}>
                  {item.description}
                </span>
              </div>
              <span
                role="status"
                style={{
                  fontWeight: 'var(--peso-destacado)',
                  padding: 'var(--espacio-1) var(--espacio-2)',
                  borderRadius: 'var(--radio-borde)',
                  backgroundColor: item.available ? 'var(--color-exito-fondo)' : 'var(--color-error-fondo)',
                  color: item.available ? 'var(--color-exito-texto)' : 'var(--color-error-texto)',
                  fontSize: 'var(--texto-sm)',
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
          border: 'var(--borde-grosor) solid var(--color-borde)',
          borderRadius: 'var(--radio-borde)',
          padding: 'var(--espacio-6)',
        }}
      >
        <h2 style={{ fontSize: 'var(--texto-xl)', marginBottom: 'var(--espacio-4)' }}>
          Verificación de Reactividad
        </h2>
        <p style={{ marginBottom: 'var(--espacio-4)', color: 'var(--color-texto-secundario)' }}>
          Verificaciones realizadas:{' '}
          <strong data-testid="contador-pruebas">{checkCounter}</strong>
        </p>
        <button
          type="button"
          onClick={handleRecheck}
          style={{
            padding: 'var(--espacio-2) var(--espacio-4)',
            backgroundColor: 'var(--color-boton-fondo)',
            color: 'var(--color-boton-texto)',
            border: 'none',
            borderRadius: 'var(--radio-borde)',
            cursor: 'pointer',
            fontSize: 'var(--texto-base)',
          }}
        >
          Reevaluar capacidades
        </button>
      </section>
    </>
  );
}
