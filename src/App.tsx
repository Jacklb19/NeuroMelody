import { useState } from 'react';
import type { FuenteSenal } from './features/adquisicion/contrato';
import { PanelAdquisicion } from './features/adquisicion/PanelAdquisicion';
import { DiagnosticoPage } from './features/diagnostico/DiagnosticoPage';
import { PanelSenal } from './features/senal/PanelSenal';

export function App(): React.JSX.Element {
  // La fuente se comparte: la adquisición la crea y el análisis la consume.
  const [fuente, setFuente] = useState<FuenteSenal | null>(null);

  return (
    <main>
      <header style={{ marginBottom: 'var(--espacio-8)' }}>
        <h1 style={{ fontSize: 'var(--texto-2xl)', marginBottom: 'var(--espacio-2)' }}>NeuroMelody</h1>
        <p style={{ color: 'var(--color-texto-secundario)' }}>
          Música generativa que acompaña tus señales fisiológicas.
        </p>
      </header>
      <PanelAdquisicion fuente={fuente} alCambiarFuente={setFuente} />
      <PanelSenal fuente={fuente} />
      <DiagnosticoPage />
    </main>
  );
}

export default App;
