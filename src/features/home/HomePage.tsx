import { Link } from 'react-router';
import { usePageTitle } from '../../app/usePageTitle';
import { DEFAULT_DURATION_MIN } from '../plan/plan';
import { PageHeading } from '../../shared/PageHeading';

/** Entry point for preparing or starting an existing listening plan. */
export function HomePage(): React.JSX.Element {
  usePageTitle('Inicio');
  return (
    <div className="home-page">
      <PageHeading eyebrow="Música adaptativa · a tu ritmo" title="NeuroMelody">
        <p>
          Música generativa que acompaña tus señales fisiológicas. Es una herramienta de bienestar,
          no un dispositivo médico.
        </p>
      </PageHeading>
      <ul className="home-actions">
        <li>
          <Link to="/plan" className="button button-primary">
            Preparar una sesión <span aria-hidden="true">↗</span>
          </Link>
        </li>
        <li>
          <Link to="/session" className="home-default-link">
            Empezar con el plan por defecto ({DEFAULT_DURATION_MIN} minutos)
          </Link>
        </li>
      </ul>
      <div className="home-details">
        <span>10–60 minutos</span><span>Música generativa</span><span>Cambios graduales</span>
      </div>
    </div>
  );
}
