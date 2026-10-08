import { Link } from 'react-router';
import { usePageTitle } from '../../app/usePageTitle';
import { APP_NAME } from '../../config/app';
import { ROUTES } from '../../config/routes';
import { useMessages } from '../../i18n/messages';
import { DEFAULT_DURATION_MIN, MAX_DURATION_MIN, MIN_DURATION_MIN } from '../plan/plan';
import { PageHeading } from '../../shared/PageHeading';

/** Entry point for preparing or starting an existing listening plan. */
export function HomePage(): React.JSX.Element {
  const t = useMessages();
  usePageTitle(t.home.pageTitle);
  return (
    <div className="home-page">
      <PageHeading eyebrow={t.home.eyebrow} title={APP_NAME}>
        <p>
          {t.home.introduction}
        </p>
      </PageHeading>
      <ul className="home-actions">
        <li>
          <Link to={ROUTES.plan} className="button button-primary">
            {t.home.prepareSession} <span aria-hidden="true">↗</span>
          </Link>
        </li>
        <li>
          <Link to={ROUTES.session} className="home-default-link">
            {t.home.startWithDefaultPlan(DEFAULT_DURATION_MIN)}
          </Link>
        </li>
      </ul>
      <div className="home-details">
        <span>{t.home.durationRange(MIN_DURATION_MIN, MAX_DURATION_MIN)}</span>
        <span>{t.home.generativeMusic}</span>
        <span>{t.home.gradualChanges}</span>
      </div>
    </div>
  );
}
