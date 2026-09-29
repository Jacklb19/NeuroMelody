import { useState, useId } from 'react';
import { useTituloPagina } from '../../app/usePageTitle';
import { verificarCapacidades } from './checkCapabilities';
import type { CapacidadesEntorno } from './diagnostics.types';

export function DiagnosticoPage(): React.JSX.Element {
  useTituloPagina('Diagnóstico de la plataforma');
  const [capacidades, setCapacidades] = useState<CapacidadesEntorno>(() =>
    verificarCapacidades(),
  );
  const [contadorPrueba, setContadorPrueba] = useState<number>(0);
  const listaId = useId();

  const handleRecalcular = (): void => {
    setCapacidades(verificarCapacidades());
    setContadorPrueba((prev) => prev + 1);
  };

  const items = [
    {
      etiqueta: 'Aislamiento de origen cruzado (crossOriginIsolated)',
      descripcion:
        'Indica si las cabeceras COOP y COEP están activas y habilitan memoria compartida.',
      activo: capacidades.crossOriginIsolated,
    },
    {
      etiqueta: 'Soporte de Web Workers',
      descripcion:
        'Permite delegar tareas de cómputo en segundo plano sin congelar la interfaz.',
      activo: capacidades.soportaWorkers,
    },
    {
      etiqueta: 'Soporte de WebAssembly',
      descripcion:
        'Habilita la ejecución de módulos compilados de alto rendimiento en el cliente.',
      activo: capacidades.soportaWebAssembly,
    },
    {
      etiqueta: 'Soporte de SharedArrayBuffer',
      descripcion:
        'Permite compartir memoria entre hilos sin copias estructuradas.',
      activo: capacidades.soportaSharedArrayBuffer,
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
        aria-labelledby={listaId}
        style={{
          border: 'var(--borde-grosor) solid var(--color-borde)',
          borderRadius: 'var(--radio-borde)',
          padding: 'var(--espacio-6)',
          marginBottom: 'var(--espacio-8)',
        }}
      >
        <h2 id={listaId} style={{ fontSize: 'var(--texto-xl)', marginBottom: 'var(--espacio-4)' }}>
          Capacidades detectadas en tiempo de ejecución
        </h2>

        <ul style={{ listStyle: 'none', display: 'grid', gap: 'var(--espacio-4)' }}>
          {items.map((item) => (
            <li
              key={item.etiqueta}
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
                <strong style={{ display: 'block' }}>{item.etiqueta}</strong>
                <span style={{ fontSize: 'var(--texto-sm)', color: 'var(--color-texto-tenue)' }}>
                  {item.descripcion}
                </span>
              </div>
              <span
                role="status"
                style={{
                  fontWeight: 'var(--peso-destacado)',
                  padding: 'var(--espacio-1) var(--espacio-2)',
                  borderRadius: 'var(--radio-borde)',
                  backgroundColor: item.activo ? 'var(--color-exito-fondo)' : 'var(--color-error-fondo)',
                  color: item.activo ? 'var(--color-exito-texto)' : 'var(--color-error-texto)',
                  fontSize: 'var(--texto-sm)',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.activo ? 'Disponible' : 'No disponible'}
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
          <strong data-testid="contador-pruebas">{contadorPrueba}</strong>
        </p>
        <button
          type="button"
          onClick={handleRecalcular}
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
