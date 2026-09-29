import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { useTituloPagina } from '../../app/useTituloPagina';
import type { FuenteSenal } from '../adquisicion/contrato';
import { PanelAdquisicion } from '../adquisicion/PanelAdquisicion';
import { leerDuracion } from '../plan/plan';
import { PanelSenal } from '../senal/PanelSenal';

/** Sesión en curso (docs/pantallas.md, `/sesion`). */
export function PaginaSesion(): React.JSX.Element {
  useTituloPagina('Sesión');
  const [parametros] = useSearchParams();
  const duracionMin = leerDuracion(parametros.get('duracion'));
  // La fuente se comparte: la adquisición la crea y el análisis la consume.
  const [fuente, setFuente] = useState<FuenteSenal | null>(null);

  return (
    <>
      <h1 style={{ fontSize: 'var(--texto-2xl)', marginBottom: 'var(--espacio-2)' }}>Sesión</h1>
      <p style={{ color: 'var(--color-texto-secundario)', marginBottom: 'var(--espacio-6)' }}>
        Plan: {duracionMin} minutos.
      </p>
      <PanelAdquisicion fuente={fuente} alCambiarFuente={setFuente} />
      <PanelSenal fuente={fuente} />
    </>
  );
}
