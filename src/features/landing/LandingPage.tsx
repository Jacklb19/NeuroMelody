import { Suspense, lazy, useCallback, useId, useRef, useState } from 'react';
import { Link } from 'react-router';
import { MAIN_CONTENT_ID } from '../../app/Layout';
import { usePageTitle } from '../../app/usePageTitle';
import { APP_NAME, SOURCE_CODE_URL } from '../../config/app';
import { ROUTES } from '../../config/routes';
import { useMessages } from '../../i18n/messages';
import { SOURCE_KIND_IDS, type SourceKind } from '../acquisition/sourceCatalog';
import { SOURCE_TRAITS } from '../acquisition/sourceTraits';
import { CALIBRATION_MIN, MAX_DURATION_MIN, MIN_DURATION_MIN } from '../plan/plan';
import { ANALYSIS_WINDOW_MS } from '../signal/processing/thresholds';
import { MS_PER_MINUTE } from '../../shared/time';
import { HeartbeatSimulator } from './heartbeatSimulator';
import {
  LANDING_HIGHLIGHT_IDS,
  LANDING_PRIVACY_IDS,
  LANDING_SECTIONS,
  LANDING_STEP_IDS,
  LANDING_TECHNOLOGY_IDS,
} from './landingCatalog';
import { SampleReadout } from './SampleReadout';
import { useReveal } from './useReveal';
import { BrandMark } from '../../shared/BrandMark';
import './landing.css';

// three.js only loads with the landing page, and only where WebGL exists.
const HeroCanvas = lazy(() => import('./HeroCanvas'));

/** WebGL needs a real browser; jsdom and very old devices keep the CSS figure. */
function supportsWebGl(): boolean {
  return typeof WebGL2RenderingContext !== 'undefined' || typeof WebGLRenderingContext !== 'undefined';
}

/**
 * Public landing page (ADR-28): what NeuroMelody is, how its loop works,
 * which sources it accepts and how it treats data, with a way into the app.
 * It has its own header; the app screens keep the app layout.
 */
export function LandingPage(): React.JSX.Element {
  const t = useMessages();
  const copy = t.landing;
  usePageTitle(copy.pageTitle);
  const pageRef = useRef<HTMLDivElement | null>(null);
  useReveal(pageRef);
  const [heart] = useState(() => new HeartbeatSimulator());
  const [sceneAvailable, setSceneAvailable] = useState(supportsWebGl);
  const handleUnavailable = useCallback(() => { setSceneAvailable(false); }, []);
  const heroTitleId = useId();
  const sourceNames: Readonly<Record<SourceKind, string>> = t.acquisition.sources;
  const stepTexts: Readonly<Record<(typeof LANDING_STEP_IDS)[number], string>> = {
    signal: copy.steps.items.signal.text,
    analysis: copy.steps.items.analysis.text(ANALYSIS_WINDOW_MS / MS_PER_MINUTE),
    state: copy.steps.items.state.text(CALIBRATION_MIN),
    music: copy.steps.items.music.text,
  };

  return (
    <div className="landing" ref={pageRef}>
      <a href={`#${MAIN_CONTENT_ID}`} className="skip-link">{t.app.skipToContent}</a>
      <header className="landing-header">
        <Link to={ROUTES.home} className="brand landing-brand" aria-label={APP_NAME}>
          <BrandMark />
          {APP_NAME}
        </Link>
        <nav aria-label={copy.navigationLabel}>
          <ul>
            <li><a href={`#${LANDING_SECTIONS.howItWorks}`}>{copy.nav.howItWorks}</a></li>
            <li><a href={`#${LANDING_SECTIONS.sources}`}>{copy.nav.sources}</a></li>
            <li><a href={`#${LANDING_SECTIONS.privacy}`}>{copy.nav.privacy}</a></li>
            <li><a href={`#${LANDING_SECTIONS.technology}`}>{copy.nav.technology}</a></li>
          </ul>
        </nav>
        <Link to={ROUTES.account} className="landing-signin">{copy.nav.signIn}</Link>
        <Link to={ROUTES.app} className="landing-cta-small">{copy.nav.openApp}</Link>
      </header>

      <main id={MAIN_CONTENT_ID} tabIndex={-1}>
        <section className="hero" aria-labelledby={heroTitleId}>
          <div className="hero-figure" role="img" aria-label={copy.hero.sceneLabel}>
            {/* The CSS figure stands in only where the 3D scene cannot run. */}
            {!sceneAvailable && <div className="hero-orb-fallback" aria-hidden="true" />}
            {sceneAvailable && (
              <Suspense fallback={null}>
                <HeroCanvas heart={heart} onUnavailable={handleUnavailable} />
              </Suspense>
            )}
          </div>
          <div className="hero-copy">
            <p className="landing-eyebrow hero-eyebrow">{copy.hero.eyebrow}</p>
            <h1 id={heroTitleId} className="hero-title">
              <span>{copy.hero.title.before}</span>{' '}
              <em>{copy.hero.title.accent}</em>{' '}
              <span>{copy.hero.title.after}</span>
            </h1>
            <p className="hero-lead">{copy.hero.lead}</p>
            <div className="hero-actions">
              <Link to={ROUTES.app} className="landing-button landing-button-primary">{copy.hero.start}</Link>
              <a href={`#${LANDING_SECTIONS.howItWorks}`} className="landing-button landing-button-ghost">{copy.hero.howItWorks}</a>
            </div>
            <p className="hero-note">{copy.hero.note}</p>
          </div>
          <SampleReadout heart={heart} />
        </section>

        <section className="landing-section about" aria-labelledby={`${heroTitleId}-about`}>
          <div className="landing-inner about-grid">
            <div data-reveal>
              <p className="landing-eyebrow">{copy.about.eyebrow}</p>
              <h2 id={`${heroTitleId}-about`} className="landing-title">{copy.about.title}</h2>
            </div>
            <p className="about-body" data-reveal>{copy.about.body}</p>
            <ul className="highlights">
              {LANDING_HIGHLIGHT_IDS.map((id) => (
                <li key={id} data-reveal>
                  <h3>{copy.about.highlights[id].title}</h3>
                  <p>{copy.about.highlights[id].text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id={LANDING_SECTIONS.howItWorks} tabIndex={-1} className="landing-section steps" aria-labelledby={`${heroTitleId}-steps`}>
          <div className="landing-inner">
            <div className="section-heading" data-reveal>
              <p className="landing-eyebrow">{copy.steps.eyebrow}</p>
              <h2 id={`${heroTitleId}-steps`} className="landing-title">{copy.steps.title}</h2>
              <p className="section-intro">{copy.steps.intro}</p>
            </div>
            {/* An ordered list: the loop really runs in this order. */}
            <ol className="step-list" data-reveal>
              {LANDING_STEP_IDS.map((id, index) => (
                <li key={id} className="step" style={{ '--step-index': index } as React.CSSProperties}>
                  <span className="step-node" aria-hidden="true" />
                  <h3>{copy.steps.items[id].title}</h3>
                  <p>{stepTexts[id]}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id={LANDING_SECTIONS.sources} tabIndex={-1} className="landing-section sources" aria-labelledby={`${heroTitleId}-sources`}>
          <div className="landing-inner">
            <div className="section-heading" data-reveal>
              <p className="landing-eyebrow">{copy.sources.eyebrow}</p>
              <h2 id={`${heroTitleId}-sources`} className="landing-title">{copy.sources.title}</h2>
            </div>
            <ul className="source-list">
              {SOURCE_KIND_IDS.map((id) => (
                <li key={id} data-reveal>
                  <h3>
                    {sourceNames[id]}
                    {SOURCE_TRAITS[id].experimental && <span className="source-badge">{copy.sources.experimental}</span>}
                  </h3>
                  <p>{copy.sources.descriptions[id]}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id={LANDING_SECTIONS.privacy} tabIndex={-1} className="landing-section privacy-band" aria-labelledby={`${heroTitleId}-privacy`}>
          <div className="landing-inner privacy-grid">
            <div data-reveal>
              <p className="landing-eyebrow">{copy.privacy.eyebrow}</p>
              <h2 id={`${heroTitleId}-privacy`} className="landing-title">{copy.privacy.title}</h2>
            </div>
            <ul className="privacy-points">
              {LANDING_PRIVACY_IDS.map((id) => <li key={id} data-reveal>{copy.privacy.points[id]}</li>)}
            </ul>
            <Link to={ROUTES.privacy} className="privacy-link" data-reveal>{copy.privacy.link}</Link>
          </div>
        </section>

        <section id={LANDING_SECTIONS.technology} tabIndex={-1} className="landing-section technology" aria-labelledby={`${heroTitleId}-technology`}>
          <div className="landing-inner">
            <div className="section-heading" data-reveal>
              <p className="landing-eyebrow">{copy.technology.eyebrow}</p>
              <h2 id={`${heroTitleId}-technology`} className="landing-title">{copy.technology.title}</h2>
            </div>
            <dl className="technology-list">
              {LANDING_TECHNOLOGY_IDS.map((id) => (
                <div key={id} data-reveal>
                  <dt>{copy.technology.items[id].name}</dt>
                  <dd>{copy.technology.items[id].text}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="landing-section closing" aria-labelledby={`${heroTitleId}-closing`}>
          <div className="landing-inner closing-inner" data-reveal>
            <h2 id={`${heroTitleId}-closing`} className="closing-title">{copy.closing.title}</h2>
            <p>{copy.closing.text(MIN_DURATION_MIN, MAX_DURATION_MIN)}</p>
            <Link to={ROUTES.plan} className="landing-button landing-button-primary">{copy.closing.action}</Link>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-inner footer-inner">
          <p className="footer-brand"><BrandMark />{APP_NAME}</p>
          <p>{copy.footer.notice}</p>
          <ul>
            <li><Link to={ROUTES.privacy}>{copy.footer.privacy}</Link></li>
            <li><Link to={ROUTES.diagnostics}>{copy.footer.diagnostics}</Link></li>
            <li><a href={SOURCE_CODE_URL} rel="noreferrer">{copy.footer.sourceCode}</a></li>
          </ul>
          <p className="footer-project">{copy.footer.project}</p>
        </div>
      </footer>
    </div>
  );
}
