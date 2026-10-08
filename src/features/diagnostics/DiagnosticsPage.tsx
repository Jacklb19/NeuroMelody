import { useState, useId } from 'react';
import { usePageTitle } from '../../app/usePageTitle';
import { useMessages } from '../../i18n/messages';
import { CAPABILITY_IDS, type CapabilityCopy, type CapabilityId } from './capabilityCatalog';
import { checkCapabilities } from './checkCapabilities';
import type { EnvironmentCapabilities } from './diagnostics.types';
import { PageHeading } from '../../shared/PageHeading';
import { CameraPulsePanel } from './CameraPulsePanel';

export function DiagnosticsPage(): React.JSX.Element {
  const t = useMessages();
  usePageTitle(t.diagnostics.pageTitle);
  const [capabilities, setCapabilities] = useState<EnvironmentCapabilities>(() =>
    checkCapabilities(),
  );
  const [checkCounter, setCheckCounter] = useState<number>(0);
  const listId = useId();
  // Typed against the catalog so every listed capability must have its copy.
  const capabilityCopy: Readonly<Record<CapabilityId, CapabilityCopy>> = t.diagnostics.capabilities;

  const handleRecheck = (): void => {
    setCapabilities(checkCapabilities());
    setCheckCounter((prev) => prev + 1);
  };

  return (
    <div className="diagnostics-page">
      <PageHeading eyebrow={t.diagnostics.eyebrow} title={t.diagnostics.pageTitle}>
        <p>
          {t.diagnostics.introduction}
        </p>
      </PageHeading>

      <section
        aria-labelledby={listId}
        className="capabilities-section"
      >
        <h2 id={listId}>
          {t.diagnostics.capabilitiesHeading}
        </h2>

        <ul className="capabilities-list">
          {CAPABILITY_IDS.map((id) => {
            const available = capabilities[id];
            return (
              <li
                key={id}
              >
                <div>
                  <strong>{capabilityCopy[id].label}</strong>
                  <span>
                    {capabilityCopy[id].description}
                  </span>
                </div>
                <span
                  role="status"
                  className={available ? 'capability-status available' : 'capability-status unavailable'}
                >
                  {available ? t.diagnostics.available : t.diagnostics.unavailable}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <CameraPulsePanel />

      <section className="recheck-section">
        <h2>
          {t.diagnostics.recheckHeading}
        </h2>
        <p>
          {t.diagnostics.checksDone}{' '}
          <strong data-testid="check-counter">{checkCounter}</strong>
        </p>
        <button
          type="button"
          className="button button-primary"
          onClick={handleRecheck}
        >
          {t.diagnostics.recheck}
        </button>
      </section>
    </div>
  );
}
