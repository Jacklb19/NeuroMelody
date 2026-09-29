import { PanelAdquisicion } from './features/adquisicion/PanelAdquisicion';
import { DiagnosticoPage } from './features/diagnostico/DiagnosticoPage';

export function App(): React.JSX.Element {
  return (
    <main>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>NeuroMelody</h1>
        <p style={{ color: '#4b5563' }}>
          Música generativa que acompaña tus señales fisiológicas.
        </p>
      </header>
      <PanelAdquisicion />
      <DiagnosticoPage />
    </main>
  );
}

export default App;
