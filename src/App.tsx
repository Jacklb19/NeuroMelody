import { PanelAdquisicion } from './features/adquisicion/PanelAdquisicion';
import { DiagnosticoPage } from './features/diagnostico/DiagnosticoPage';

export function App(): React.JSX.Element {
  return (
    <main>
      <header style={{ marginBottom: 'var(--espacio-8)' }}>
        <h1 style={{ fontSize: 'var(--texto-2xl)', marginBottom: 'var(--espacio-2)' }}>NeuroMelody</h1>
        <p style={{ color: 'var(--color-texto-secundario)' }}>
          Música generativa que acompaña tus señales fisiológicas.
        </p>
      </header>
      <PanelAdquisicion />
      <DiagnosticoPage />
    </main>
  );
}

export default App;
