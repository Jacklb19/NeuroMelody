import { useId, useState } from 'react';
import { Link } from 'react-router';
import { usePageTitle } from '../../app/usePageTitle';
import { planPath, ROUTES, summaryPath } from '../../config/routes';
import { useMessages } from '../../i18n/messages';
import { BreathingOrb } from '../../shared/BreathingOrb';
import { ArrowRightIcon, PlayIcon } from '../../shared/icons';
import { useAuth } from '../account/authContext';
import { GOAL_IDS, type GoalId } from '../plan/goalCatalog';
import { GoalIcon } from '../plan/GoalIcon';
import { DEFAULT_DURATION_MIN } from '../plan/plan';
import { useRecordFormatter } from '../records/useRecordFormatter';
import { sessionTotals, useSessionRecords } from '../records/useSessionRecords';
import { dayPartAt, FIRST_SESSION_STEP_IDS, firstName } from './greeting';
import './home.css';

/**
 * Start screen of the app (ADR-30): a greeting, the next session one tap
 * away, the goals as shortcuts into the plan, and the person's activity on
 * this device, or how a first session goes when there is none yet.
 */
export function HomePage(): React.JSX.Element {
  const t = useMessages();
  const copy = t.home;
  usePageTitle(copy.pageTitle);
  const { state } = useAuth();
  const format = useRecordFormatter();
  const records = useSessionRecords();
  // Read once: the greeting should not change under the person's eyes.
  const [dayPart] = useState(() => dayPartAt(new Date().getHours()));
  const ids = { start: useId(), goals: useId(), activity: useId() };
  const name = state.kind === 'signed_in' ? firstName(state.user.name) : null;
  const greeting = name === null ? copy.greetings[dayPart] : copy.greetingWithName(copy.greetings[dayPart], name);
  const goalNames: Readonly<Record<GoalId, string>> = t.plan.goals.names;
  const totals = sessionTotals(records ?? []);

  return (
    <div className="home-page">
      <header className="home-greeting">
        <h1>{greeting}</h1>
        <p>{copy.question}</p>
      </header>

      <section className="start-card glass-card" aria-labelledby={ids.start}>
        <div className="start-copy">
          <p className="eyebrow">{copy.start.eyebrow}</p>
          <h2 id={ids.start}>{copy.start.title(DEFAULT_DURATION_MIN)}</h2>
          <p>{copy.start.text}</p>
          <div className="start-actions">
            <Link to={ROUTES.session} className="pill-button pill-button-primary pill-button-large">
              <PlayIcon /> {copy.start.action}
            </Link>
            <Link to={ROUTES.plan} className="pill-button pill-button-ghost pill-button-large">{copy.start.customize}</Link>
          </div>
        </div>
        <BreathingOrb className="start-orb" />
      </section>

      <section aria-labelledby={ids.goals} className="home-section">
        <h2 id={ids.goals}>{copy.goals.title}</h2>
        <p className="secondary-text">{copy.goals.hint}</p>
        <ul className="goal-shortcuts">
          {GOAL_IDS.map((goal) => (
            <li key={goal}>
              <Link to={planPath([goal])} className="glass-card goal-shortcut">
                <span className="icon-badge"><GoalIcon goal={goal} /></span>
                <span>{goalNames[goal]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {records !== null && totals.last === null && (
        <section aria-labelledby={ids.activity} className="home-section">
          <h2 id={ids.activity}>{copy.first.title}</h2>
          <ol className="first-steps">
            {FIRST_SESSION_STEP_IDS.map((step) => (
              <li key={step} className="glass-card">
                <h3>{copy.first.steps[step].title}</h3>
                <p>{copy.first.steps[step].text}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {totals.last !== null && (
        <section aria-labelledby={ids.activity} className="home-section">
          <div className="section-row">
            <h2 id={ids.activity}>{copy.activity.title}</h2>
            <Link to={ROUTES.history} className="section-link">{copy.activity.seeHistory} <ArrowRightIcon /></Link>
          </div>
          <dl className="home-stats">
            <div className="glass-card"><dt>{copy.activity.sessions}</dt><dd>{totals.count}</dd></div>
            <div className="glass-card"><dt>{copy.activity.minutes}</dt><dd>{totals.minutes}</dd></div>
            <div className="glass-card last-session">
              <dt>{copy.last.title}</dt>
              <dd>{format.sessionDate(totals.last.startedAt)}</dd>
              <dd className="last-session-detail">
                {copy.last.detail(format.listened(totals.last.listenedSeconds), format.goals(totals.last.goals))}
              </dd>
              <dd className="last-session-detail"><Link to={summaryPath(totals.last.id)}>{copy.last.view}</Link></dd>
            </div>
          </dl>
        </section>
      )}

      <p className="home-notice">{copy.notice}</p>
    </div>
  );
}
