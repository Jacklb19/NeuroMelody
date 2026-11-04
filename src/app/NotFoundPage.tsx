import { Link } from 'react-router';
import { ROUTES } from '../config/routes';
import { useMessages } from '../i18n/messages';
import { PageHeading } from '../shared/PageHeading';
import { usePageTitle } from './usePageTitle';

/** Any address no screen claims: says so and offers the ways back, instead of moving the person silently. */
export function NotFoundPage(): React.JSX.Element {
  const copy = useMessages().app.notFound;
  usePageTitle(copy.title);
  return (
    <div className="not-found-page">
      <PageHeading eyebrow={copy.eyebrow} title={copy.title}>
        <p>{copy.text}</p>
      </PageHeading>
      <div className="action-row">
        <Link to={ROUTES.app} className="pill-button pill-button-primary">{copy.app}</Link>
        <Link to={ROUTES.home} className="pill-button pill-button-ghost">{copy.landing}</Link>
      </div>
    </div>
  );
}
