import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { useTituloPagina } from '../../app/usePageTitle';
import type { FuenteSenal } from '../acquisition/contract';
import { PanelAdquisicion } from '../acquisition/AcquisitionPanel';
import { PanelReproduccion } from '../audio/ui/PlaybackPanel';
import { leerDuracion } from '../plan/plan';
import { PanelSenal } from '../signal/SignalPanel';

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
      <PanelReproduccion duracionMin={duracionMin} />
      <PanelAdquisicion fuente={fuente} alCambiarFuente={setFuente} />
      <PanelSenal fuente={fuente} />
    </>
  );
}
