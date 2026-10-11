import { useState } from 'react';
import { useMessages } from '../i18n/messages';

interface ConfirmButtonProps {
  readonly label: string;
  readonly confirmLabel: string;
  readonly onConfirm: () => void;
}

/** Deletion asks once more in place, so a stray click never erases data. */
export function ConfirmButton({ label, confirmLabel, onConfirm }: ConfirmButtonProps): React.JSX.Element {
  const t = useMessages();
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return <button type="button" className="text-button danger-text" onClick={() => { setAsking(true); }}>{label}</button>;
  }
  return (
    <span className="confirm-group" role="group" aria-label={label}>
      <button type="button" className="button button-danger" onClick={onConfirm}>{confirmLabel}</button>
      <button type="button" className="text-button" onClick={() => { setAsking(false); }}>{t.common.cancel}</button>
    </span>
  );
}
