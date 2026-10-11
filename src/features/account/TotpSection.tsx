import { useCallback, useEffect, useId, useState } from 'react';
import { useFormatters, useMessages } from '../../i18n/messages';
import { ConfirmButton } from '../../shared/ConfirmButton';
import type { AuthService, TotpEnrollment, TotpFactor } from './authService';
import { TOTP_CODE_LENGTH } from './config';
import { FormError } from './FormError';
import { TotpCodeForm } from './TotpCodeForm';
import { useAccountAction } from './useAccountAction';

interface TotpSectionProps {
  readonly service: AuthService;
  /** Called after a device is added or removed, since the assurance level may change. */
  readonly onChanged: () => Promise<void>;
}

/**
 * Second factor (ADR-10): add authenticator apps, one per device, and remove
 * them. A second device is the recovery path if one is lost.
 */
export function TotpSection({ service, onChanged }: TotpSectionProps): React.JSX.Element {
  const t = useMessages();
  const format = useFormatters();
  const copy = t.account.totp;
  const [factors, setFactors] = useState<readonly TotpFactor[] | null>(null);
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  const [added, setAdded] = useState(false);
  const { pending, error, run } = useAccountAction();
  const titleId = useId();

  const load = useCallback(async () => {
    await run(async () => { setFactors(await service.listTotpFactors()); });
  }, [run, service]);

  useEffect(() => { void load(); }, [load]);

  const start = async (): Promise<void> => {
    setAdded(false);
    const name = copy.deviceName((factors?.length ?? 0) + 1);
    await run(async () => { setEnrollment(await service.enrollTotp(name)); });
  };

  const verify = async (code: string): Promise<void> => {
    if (enrollment === null) return;
    await service.verifyTotp(enrollment.factorId, code);
    setEnrollment(null);
    setAdded(true);
    await load();
    await onChanged();
  };

  const remove = async (factorId: string): Promise<void> => {
    setAdded(false);
    if (await run(() => service.removeTotp(factorId))) {
      await load();
      await onChanged();
    }
  };

  return (
    <section className="account-section" aria-labelledby={titleId}>
      <h2 id={titleId}>{copy.title}</h2>
      <p className="secondary-text">{copy.description(TOTP_CODE_LENGTH)}</p>

      <h3 className="account-subtitle">{copy.devicesLabel}</h3>
      {factors !== null && factors.length === 0 && <p>{copy.noDevices}</p>}
      {factors !== null && factors.length > 0 && (
        <ul className="device-list">
          {factors.map((factor, index) => (
            <li key={factor.id}>
              <span>
                <strong>{factor.name ?? copy.deviceName(index + 1)}</strong>
                <span className="secondary-text"> · {copy.addedOn(format.dateTime(factor.createdAt))}</span>
              </span>
              <ConfirmButton label={copy.remove} confirmLabel={copy.confirmRemove} onConfirm={() => { void remove(factor.id); }} />
            </li>
          ))}
        </ul>
      )}
      {added && <p role="status" className="account-notice">{copy.added}</p>}
      {factors !== null && factors.length === 1 && <p className="field-hint">{copy.recoveryAdvice}</p>}
      <FormError code={error} />

      {enrollment === null ? (
        <button type="button" className="button button-secondary" disabled={pending} onClick={() => { void start(); }}>
          {factors !== null && factors.length > 0 ? copy.addAnother : copy.add}
        </button>
      ) : (
        <div className="enrollment">
          <p>{copy.scan}</p>
          <img className="totp-qr" src={enrollment.qrCodeUrl} alt={copy.qrAlt} />
          <p className="field-hint">{copy.secretLabel}</p>
          <code className="totp-secret">{enrollment.secret}</code>
          <TotpCodeForm onVerify={verify} onCancel={() => { setEnrollment(null); }} />
        </div>
      )}
    </section>
  );
}
