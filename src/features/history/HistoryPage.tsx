import { useCallback, useEffect, useId, useState } from 'react';
import { Link } from 'react-router';
import { usePageTitle } from '../../app/usePageTitle';
import { formatChange, formatListened, formatRatings, formatSessionDate } from '../records/formatRecord';
import type { SessionRecord } from '../records/sessionRecord';
import { useSessionStore } from '../records/sessionStoreContext';
import { summarizeSession } from '../records/summarizeSession';
import { PageHeading } from '../../shared/PageHeading';
import { Sparkline } from '../../shared/Sparkline';

type Loaded =
  | { readonly kind: 'loading' }
  | { readonly kind: 'error'; readonly message: string }
  | { readonly kind: 'ready'; readonly records: readonly SessionRecord[] };

const messageOf = (error: unknown): string => (error instanceof Error ? error.message : 'Error desconocido.');

/**
 * Sessions saved on this device and how their indicators evolve
 * (RF-16, HU-10). Everything here can be deleted without an account.
 */
export function HistoryPage(): React.JSX.Element {
  usePageTitle('Historial');
  const store = useSessionStore();
  const [loaded, setLoaded] = useState<Loaded>({ kind: 'loading' });

  const reload = useCallback((): Promise<void> => store.list().then(
    (records) => { setLoaded({ kind: 'ready', records }); },
    (error: unknown) => { setLoaded({ kind: 'error', message: messageOf(error) }); },
  ), [store]);

  useEffect(() => { void reload(); }, [reload]);

  const remove = (id: string): void => {
    store.delete(id).then(reload, (error: unknown) => { setLoaded({ kind: 'error', message: messageOf(error) }); });
  };
  const removeAll = (): void => {
    store.clear().then(reload, (error: unknown) => { setLoaded({ kind: 'error', message: messageOf(error) }); });
  };

  return (
    <div className="history-page">
      <PageHeading eyebrow="Tus sesiones" title="Historial">
        <p>Las sesiones se guardan solo en este dispositivo. Puedes borrarlas cuando quieras.</p>
      </PageHeading>
      {loaded.kind === 'loading' && <p className="secondary-text">Cargando el historial…</p>}
      {loaded.kind === 'error' && <p className="quiet-notice" role="alert">No se pudo leer el historial ({loaded.message}).</p>}
      {loaded.kind === 'ready' && (loaded.records.length === 0 ? <EmptyHistory /> : (
        <>
          <Evolution records={loaded.records} />
          <ol className="history-list">
            {loaded.records.map((record) => (
              <HistoryItem key={record.id} record={record} onDelete={remove} />
            ))}
          </ol>
          <ConfirmButton
            label="Borrar todo el historial"
            confirmLabel="Sí, borrar todas las sesiones"
            onConfirm={removeAll}
          />
        </>
      ))}
    </div>
  );
}

function EmptyHistory(): React.JSX.Element {
  return (
    <div className="empty-state">
      <p>Aún no hay sesiones guardadas. Cuando termines una sesión de escucha aparecerá aquí, con su resumen.</p>
      <Link to="/plan" className="button button-primary">Preparar una sesión</Link>
    </div>
  );
}

/** Trend across sessions, oldest to newest, with the same data listed below as text. */
function Evolution({ records }: { readonly records: readonly SessionRecord[] }): React.JSX.Element | null {
  const titleId = useId();
  if (records.length < 2) return null;
  const chronological = [...records].reverse();
  const finalRmssd = chronological.map((record) => summarizeSession(record).rmssd?.end ?? null);
  const ratingsAfter = chronological.map((record) => record.ratingAfter);
  return (
    <section aria-labelledby={titleId} className="evolution">
      <h2 id={titleId}>Evolución entre sesiones</h2>
      <div className="evolution-charts">
        <figure>
          <Sparkline values={finalRmssd} label="Variabilidad entre latidos al final de cada sesión, de la más antigua a la más reciente" />
          <figcaption>Variabilidad entre latidos al final de cada sesión</figcaption>
        </figure>
        <figure>
          <Sparkline values={ratingsAfter} label="Cómo te sentías al terminar cada sesión, de la más antigua a la más reciente" />
          <figcaption>Cómo te sentías al terminar</figcaption>
        </figure>
      </div>
    </section>
  );
}

interface HistoryItemProps {
  readonly record: SessionRecord;
  readonly onDelete: (id: string) => void;
}

function HistoryItem({ record, onDelete }: HistoryItemProps): React.JSX.Element {
  const summary = summarizeSession(record);
  const titleId = useId();
  return (
    <li className="history-item" aria-labelledby={titleId}>
      <div className="history-heading">
        <h3 id={titleId}>{formatSessionDate(record.startedAt)}</h3>
        <span className="secondary-text">{formatListened(record.listenedSeconds)} de {record.plannedMinutes} min</span>
      </div>
      <dl className="history-figures">
        <div><dt>Cómo te sentías</dt><dd>{formatRatings(record.ratingBefore, record.ratingAfter)}</dd></div>
        <div><dt>Frecuencia media</dt><dd>{formatChange(summary.heartRate, 'lpm')}</dd></div>
        <div><dt>RMSSD</dt><dd>{formatChange(summary.rmssd, 'ms')}</dd></div>
      </dl>
      <div className="history-actions">
        <Link to={`/summary/${record.id}`} className="button button-secondary">Ver resumen</Link>
        <ConfirmButton label="Borrar" confirmLabel="Sí, borrar esta sesión" onConfirm={() => { onDelete(record.id); }} />
      </div>
    </li>
  );
}

interface ConfirmButtonProps {
  readonly label: string;
  readonly confirmLabel: string;
  readonly onConfirm: () => void;
}

/** Deletion asks once more in place, so a stray click never erases data. */
function ConfirmButton({ label, confirmLabel, onConfirm }: ConfirmButtonProps): React.JSX.Element {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return <button type="button" className="text-button danger-text" onClick={() => { setAsking(true); }}>{label}</button>;
  }
  return (
    <span className="confirm-group" role="group" aria-label={label}>
      <button type="button" className="button button-danger" onClick={onConfirm}>{confirmLabel}</button>
      <button type="button" className="text-button" onClick={() => { setAsking(false); }}>Cancelar</button>
    </span>
  );
}
