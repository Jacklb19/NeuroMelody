import { useId, useState } from 'react';
import { Link } from 'react-router';
import { csvFileName, sessionToCsv } from '../records/exportCsv';
import { formatChange, formatListened, formatRatings, formatRatio, formatSessionDate } from '../records/formatRecord';
import { SelfRatingField } from '../records/SelfRatingField';
import type { SessionRecord } from '../records/sessionRecord';
import { useSessionStore } from '../records/sessionStoreContext';
import { summarizeSession } from '../records/summarizeSession';
import { downloadText } from '../../shared/downloadText';
import { PageHeading } from '../../shared/PageHeading';
import { Sparkline } from '../../shared/Sparkline';
import { StateTimeShare } from './StateTimeShare';

interface SessionSummaryViewProps {
  readonly record: SessionRecord;
  readonly onRecordChange: (record: SessionRecord) => void;
}

function describeRatingChange(change: number | null): string | null {
  if (change === null) return null;
  if (change === 0) return 'Igual que al empezar';
  const points = Math.abs(change) === 1 ? 'punto' : 'puntos';
  return `${String(Math.abs(change))} ${points} ${change > 0 ? 'más' : 'menos'} que al empezar`;
}

/** Indicators of one finished session, its self-ratings and the CSV download. */
export function SessionSummaryView({ record, onRecordChange }: SessionSummaryViewProps): React.JSX.Element {
  const summary = summarizeSession(record);
  const ratingChange = describeRatingChange(summary.ratingChange);
  const figuresId = useId();
  const trendValues = record.samples.map((sample) => (sample.goodQuality ? sample.rmssd : null));

  return (
    <div className="summary-page">
      <PageHeading eyebrow="Resumen de la sesión" title={formatSessionDate(record.startedAt)}>
        <p>Escuchaste {formatListened(record.listenedSeconds)} de un plan de {record.plannedMinutes} minutos.</p>
      </PageHeading>

      {record.ratingAfter === null && <AfterRating record={record} onSaved={onRecordChange} />}

      <section aria-labelledby={figuresId} className="summary-section">
        <h2 id={figuresId}>Al inicio y al final</h2>
        <dl className="summary-figures">
          <div>
            <dt>Cómo te sentías</dt>
            <dd>{formatRatings(record.ratingBefore, record.ratingAfter)}</dd>
            {ratingChange !== null && <dd className="figure-note">{ratingChange}</dd>}
          </div>
          <div>
            <dt>Frecuencia cardíaca media</dt>
            <dd data-testid="summary-heart-rate">{formatChange(summary.heartRate, 'lpm')}</dd>
          </div>
          <div>
            <dt>Variabilidad entre latidos (RMSSD)</dt>
            <dd>{formatChange(summary.rmssd, 'ms')}</dd>
            <dd className="figure-trend">
              <Sparkline values={trendValues} label="Variabilidad entre latidos a lo largo de la sesión" />
            </dd>
          </div>
          <div>
            <dt>Razón LF/HF al final</dt>
            <dd>{formatRatio(summary.lfHfAtEnd)}</dd>
          </div>
        </dl>
        <p className="panel-footnote">
          Cada valor promedia hasta 15 s de señal de buena calidad al principio y al final. Son indicadores
          descriptivos de tu señal: no miden el dolor ni son una valoración clínica.
        </p>
      </section>

      <StateTimeShare secondsByState={summary.secondsByState} />

      <section className="summary-section" aria-label="Resumen en lenguaje sencillo">
        <p className="pending-note">
          <strong>Resumen automático pendiente.</strong> El texto en lenguaje sencillo, generado automáticamente,
          estará disponible cuando conectes tu cuenta.
        </p>
      </section>

      <div className="action-row summary-actions">
        <button
          type="button"
          className="button button-primary"
          onClick={() => { downloadText(csvFileName(record), sessionToCsv(record), 'text/csv;charset=utf-8'); }}
        >
          Descargar datos (CSV)
        </button>
        <Link to="/history" className="button button-secondary">Ver historial</Link>
        <Link to="/plan" className="button button-secondary">Preparar otra sesión</Link>
      </div>
    </div>
  );
}

interface AfterRatingProps {
  readonly record: SessionRecord;
  readonly onSaved: (record: SessionRecord) => void;
}

/** Asks how the person feels after listening; skipping it is always fine. */
function AfterRating({ record, onSaved }: AfterRatingProps): React.JSX.Element {
  const store = useSessionStore();
  const [rating, setRating] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = (): void => {
    store.setRatingAfter(record.id, rating).then(onSaved, (cause: unknown) => {
      setError(cause instanceof Error ? cause.message : 'Error desconocido.');
    });
  };

  return (
    <section className="after-rating" aria-label="Valoración al terminar">
      <SelfRatingField legend="¿Cómo te sientes ahora, al terminar?" value={rating} onChange={setRating} />
      <button type="button" className="button button-primary" disabled={rating === null} onClick={save}>
        Guardar valoración
      </button>
      {error !== null && <p className="quiet-notice" role="alert">No se pudo guardar la valoración ({error}).</p>}
    </section>
  );
}
