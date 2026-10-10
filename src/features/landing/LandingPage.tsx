import { Suspense, lazy, useCallback, useId, useRef, useState } from 'react';
import { Link } from 'react-router';
import { MAIN_CONTENT_ID } from '../../app/Layout';
import { usePageTitle } from '../../app/usePageTitle';
import { APP_NAME } from '../../config/app';
import { ROUTES } from '../../config/routes';
import { useMessages } from '../../i18n/messages';
import { BrandMark } from '../../shared/BrandMark';
import { ArrowRightIcon, HeartIcon, NoteIcon, ShieldIcon, SparkIcon, WaveIcon } from '../../shared/icons';
import { SourceIcon } from '../acquisition/SourceIcon';
import { SOURCE_KIND_IDS, type SourceKind } from '../acquisition/sourceCatalog';
import { SOURCE_TRAITS } from '../acquisition/sourceTraits';
import { GOAL_IDS, type GoalId } from '../plan/goalCatalog';
import { GoalIcon } from '../plan/GoalIcon';
import { CALIBRATION_MIN, MAX_DURATION_MIN, MIN_DURATION_MIN } from '../plan/plan';
import { HeartbeatSimulator } from './heartbeatSimulator';
import { LANDING_HIGHLIGHT_IDS, LANDING_PRIVACY_IDS, LANDING_SECTIONS, LANDING_STEP_IDS } from './landingCatalog';
import { PulseToMelody } from './PulseToMelody';
import { SampleReadout } from './SampleReadout';
import { useReveal } from './useReveal';
import './landing.css';

// three.js only loads with the landing page, and only where WebGL exists.
const HeroCanvas = lazy(() => import('./HeroCanvas'));

/** WebGL needs a real browser; jsdom and very old devices keep the CSS figure. */
function supportsWebGl(): boolean {
  return typeof WebGL2RenderingContext !== 'undefined' || typeof WebGLRenderingContext !== 'undefined';
}

type IconComponent = (props: { className?: string }) => React.JSX.Element;

/** Icon of each highlight and step; keyed by the catalogs so none is left without one. */
const HIGHLIGHT_ICONS: Readonly<Record<(typeof LANDING_HIGHLIGHT_IDS)[number], IconComponent>> = {
  generative: SparkIcon,
  listening: HeartIcon,
  gradual: WaveIcon,
};
const STEP_ICONS: Readonly<Record<(typeof LANDING_STEP_IDS)[number], IconComponent>> = {
  signal: HeartIcon,
  analysis: WaveIcon,
  state: SparkIcon,
  music: NoteIcon,
};

/**
 * Public landing page (ADR-28, ADR-30): what NeuroMelody is, how it works,
 * what it is for and how it treats data, in plain words, with the way into
 * an account. It has its own header; the app screens keep the app layout.
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
  const id = useId();
  const sourceNames: Readonly<Record<SourceKind, string>> = t.acquisition.sources;
  const goalNames: Readonly<Record<GoalId, string>> = t.plan.goals.names;
  const stepTexts: Readonly<Record<(typeof LANDING_STEP_IDS)[number], string>> = {
    signal: copy.steps.items.signal.text,
    analysis: copy.steps.items.analysis.text,
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
            <li><a href={`#${LANDING_SECTIONS.moments}`}>{copy.nav.moments}</a></li>
            <li><a href={`#${LANDING_SECTIONS.privacy}`}>{copy.nav.privacy}</a></li>
          </ul>
        </nav>
        <div className="landing-account">
          <Link to={ROUTES.login} className="landing-signin">{copy.nav.signIn}</Link>
          <Link to={ROUTES.register} className="pill-button pill-button-primary">{copy.nav.register}</Link>
        </div>
      </header>

      <main id={MAIN_CONTENT_ID} tabIndex={-1}>
        <section className="hero" aria-labelledby={`${id}-hero`}>
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
            <p className="landing-eyebrow">{copy.hero.eyebrow}</p>
            <h1 id={`${id}-hero`} className="hero-title">{copy.hero.title}</h1>
            <p className="hero-lead">{copy.hero.lead}</p>
            <div className="hero-actions">
              <Link to={ROUTES.register} className="pill-button pill-button-primary pill-button-large">
                {copy.hero.start} <ArrowRightIcon />
              </Link>
              <a href={`#${LANDING_SECTIONS.howItWorks}`} className="pill-button pill-button-ghost pill-button-large">{copy.hero.howItWorks}</a>
            </div>
            <p className="hero-note">{copy.hero.note}</p>
          </div>
          <SampleReadout heart={heart} />
        </section>

        <section className="landing-section about" aria-labelledby={`${id}-about`}>
          <div className="landing-inner">
            <div className="about-heading" data-reveal>
              <p className="landing-eyebrow">{copy.about.eyebrow}</p>
              <h2 id={`${id}-about`} className="landing-title">{copy.about.title}</h2>
              <p className="section-intro">{copy.about.body}</p>
            </div>
            <PulseToMelody label={copy.about.drawingLabel} />
            <ul className="highlights">
              {LANDING_HIGHLIGHT_IDS.map((highlight) => {
                const Icon = HIGHLIGHT_ICONS[highlight];
                return (
                  <li key={highlight} className="glass-card" data-reveal>
                    <span className="icon-badge"><Icon /></span>
                    <h3>{copy.about.highlights[highlight].title}</h3>
                    <p>{copy.about.highlights[highlight].text}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section id={LANDING_SECTIONS.howItWorks} tabIndex={-1} className="landing-section steps" aria-labelledby={`${id}-steps`}>
          <div className="landing-inner">
            <div className="section-heading" data-reveal>
              <p className="landing-eyebrow">{copy.steps.eyebrow}</p>
              <h2 id={`${id}-steps`} className="landing-title">{copy.steps.title}</h2>
              <p className="section-intro">{copy.steps.intro}</p>
            </div>
            {/* An ordered list: the loop really runs in this order. */}
            <ol className="step-list" data-reveal>
              {LANDING_STEP_IDS.map((step, index) => {
                const Icon = STEP_ICONS[step];
                return (
                  <li key={step} className="step" style={{ '--step-index': index } as React.CSSProperties}>
                    <span className="step-node" aria-hidden="true"><Icon /></span>
                    <h3>{copy.steps.items[step].title}</h3>
                    <p>{stepTexts[step]}</p>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        <section id={LANDING_SECTIONS.moments} tabIndex={-1} className="landing-section moments" aria-labelledby={`${id}-moments`}>
          <div className="landing-inner moments-grid">
            <div className="moments-heading" data-reveal>
              <p className="landing-eyebrow">{copy.moments.eyebrow}</p>
              <h2 id={`${id}-moments`} className="landing-title">{copy.moments.title}</h2>
            </div>
            <ul className="moment-list">
              {GOAL_IDS.map((goal) => (
                <li key={goal} data-reveal>
                  <span className="icon-badge"><GoalIcon goal={goal} /></span>
                  <div>
                    <h3>{goalNames[goal]}</h3>
                    <p>{copy.moments.descriptions[goal]}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="landing-section sources" aria-labelledby={`${id}-sources`}>
          <div className="landing-inner">
            <div className="section-heading" data-reveal>
              <p className="landing-eyebrow">{copy.sources.eyebrow}</p>
              <h2 id={`${id}-sources`} className="landing-title">{copy.sources.title}</h2>
            </div>
            <ul className="source-list">
              {SOURCE_KIND_IDS.map((source) => (
                <li key={source} className="glass-card" data-reveal>
                  <span className="icon-badge"><SourceIcon source={source} /></span>
                  <h3>
                    {sourceNames[source]}
                    {SOURCE_TRAITS[source].experimental && <span className="source-badge">{copy.sources.experimental}</span>}
                  </h3>
                  <p>{copy.sources.descriptions[source]}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id={LANDING_SECTIONS.privacy} tabIndex={-1} className="landing-section privacy-band" aria-labelledby={`${id}-privacy`}>
          <div className="landing-inner privacy-grid">
            <div data-reveal>
              <span className="icon-badge icon-badge-large"><ShieldIcon /></span>
              <p className="landing-eyebrow">{copy.privacy.eyebrow}</p>
              <h2 id={`${id}-privacy`} className="landing-title">{copy.privacy.title}</h2>
              <Link to={ROUTES.privacy} className="privacy-link">{copy.privacy.link} <ArrowRightIcon /></Link>
            </div>
            <ul className="privacy-points">
              {LANDING_PRIVACY_IDS.map((point) => <li key={point} data-reveal>{copy.privacy.points[point]}</li>)}
            </ul>
          </div>
        </section>

        <section className="landing-section closing" aria-labelledby={`${id}-closing`}>
          <div className="landing-inner closing-inner" data-reveal>
            <h2 id={`${id}-closing`} className="closing-title">{copy.closing.title}</h2>
            <p>{copy.closing.text(MIN_DURATION_MIN, MAX_DURATION_MIN)}</p>
            <div className="hero-actions">
              <Link to={ROUTES.register} className="pill-button pill-button-primary pill-button-large">
                {copy.closing.action} <ArrowRightIcon />
              </Link>
              <Link to={ROUTES.login} className="pill-button pill-button-ghost pill-button-large">{copy.closing.secondary}</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-inner footer-inner">
          <p className="footer-brand"><BrandMark />{APP_NAME}</p>
          <p className="footer-notice">{copy.footer.notice}</p>
          <p className="footer-meta">
            <Link to={ROUTES.privacy}>{copy.footer.privacy}</Link>
            <span>{copy.footer.project}</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
