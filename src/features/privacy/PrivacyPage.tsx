import { useId, useState } from 'react';
import { Link } from 'react-router';
import { usePageTitle } from '../../app/usePageTitle';
import { ROUTES } from '../../config/routes';
import { useFormatters, useMessages } from '../../i18n/messages';
import { PageHeading } from '../../shared/PageHeading';
import { COMPUTE_PERIOD_S } from '../signal/processing/thresholds';
import { readConsent, writeConsent } from './consentStore';
import { PRIVACY_SECTION_IDS } from './privacyCatalog';

/**
 * How the app treats health-related data (Ley 1581 de 2012) and the explicit
 * consent to sync (RF-14, ADR-18). Readable without an account.
 */
export function PrivacyPage(): React.JSX.Element {
  const t = useMessages();
  const format = useFormatters();
  const copy = t.privacy;
  usePageTitle(copy.pageTitle);
  const [consentAt, setConsentAt] = useState(readConsent);
  const [withdrawn, setWithdrawn] = useState(false);
  const consentId = useId();
  const sectionText = (id: (typeof PRIVACY_SECTION_IDS)[number]): string =>
    id === 'device' ? copy.sections.device.text(COMPUTE_PERIOD_S) : copy.sections[id].text;

  return (
    <div className="reading-page privacy-page">
      <PageHeading eyebrow={copy.eyebrow} title={copy.pageTitle}>
        <p>{copy.introduction}</p>
      </PageHeading>

      {PRIVACY_SECTION_IDS.map((id) => (
        <section key={id} className="privacy-section" aria-labelledby={`${consentId}-${id}`}>
          <h2 id={`${consentId}-${id}`}>{copy.sections[id].title}</h2>
          <p>{sectionText(id)}</p>
        </section>
      ))}

      <section className="privacy-consent" aria-labelledby={consentId}>
        <h2 id={consentId}>{copy.consent.title}</h2>
        <div className="confirmation-control">
          <input
            id={`${consentId}-box`}
            type="checkbox"
            checked={consentAt !== null}
            onChange={(event) => {
              setConsentAt(writeConsent(event.target.checked, new Date()));
              setWithdrawn(!event.target.checked);
            }}
          />
          <label htmlFor={`${consentId}-box`}>{copy.consent.label}</label>
        </div>
        <p role="status" className="secondary-text">
          {consentAt !== null
            ? copy.consent.given(format.dateTime(consentAt))
            : withdrawn ? copy.consent.withdrawn : copy.consent.notGiven}
        </p>
        <p className="panel-footnote">{copy.consent.deviceOnly}</p>
      </section>

      <Link to={ROUTES.account} className="button button-secondary">{copy.backToAccount}</Link>
    </div>
  );
}
