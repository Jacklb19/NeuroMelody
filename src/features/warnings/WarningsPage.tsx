import { useId, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { usePageTitle } from '../../app/usePageTitle';
import { useMessages } from '../../i18n/messages';
import { STOP_SHORTCUT_KEY } from '../audio/ui/stopShortcut';
import { returnPathFrom } from './returnPath';
import { useWarningsRegistry } from './warningsContext';
import { PageHeading } from '../../shared/PageHeading';

export function WarningsPage(): React.JSX.Element {
  const t = useMessages();
  usePageTitle(t.warnings.pageTitle);
  const registry = useWarningsRegistry();
  const navigate = useNavigate();
  // Navigation state is untyped and validated before choosing the destination.
  const state: unknown = useLocation().state;
  const [confirmed, setConfirmed] = useState(false);
  const checkboxId = useId();
  // The stop hint is built from the real stop button label and key, so it follows them.
  const warnings = [
    ...t.warnings.items,
    t.warnings.stopHint(t.audio.playback.stop, t.warnings.keyNames[STOP_SHORTCUT_KEY]),
  ];

  const accept = (): void => {
    registry.accept(new Date());
    void navigate(returnPathFrom(state), { replace: true });
  };

  return (
    <div className="reading-page warnings-page">
      <PageHeading eyebrow={t.warnings.eyebrow} title={t.warnings.pageTitle} />
      <ul className="warnings-list">
        {warnings.map((text) => (
          <li key={text}>{text}</li>
        ))}
      </ul>
      <div className="confirmation-control">
        <input
          id={checkboxId}
          type="checkbox"
          checked={confirmed}
          onChange={(event) => {
            setConfirmed(event.target.checked);
          }}
        />
        <label htmlFor={checkboxId}>{t.warnings.confirmation}</label>
      </div>
      <button
        type="button"
        className="button button-primary"
        onClick={accept}
        disabled={!confirmed}
      >
        {t.warnings.accept}
      </button>
    </div>
  );
}
