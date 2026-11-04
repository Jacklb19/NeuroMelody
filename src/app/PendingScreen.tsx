import { useEffect, useState } from 'react';
import { useMessages } from '../i18n/messages';

/** How long a screen may take to load before saying so: most arrive from the cache well before. */
export const PENDING_NOTICE_DELAY_MS = 300;

/** Shown while a screen loaded on first visit arrives; it appears only if the wait is noticeable. */
export function PendingScreen(): React.JSX.Element | null {
  const t = useMessages();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => { setVisible(true); }, PENDING_NOTICE_DELAY_MS);
    return () => { clearTimeout(timer); };
  }, []);
  return visible ? <p role="status" className="pending-screen secondary-text">{t.app.loadingScreen}</p> : null;
}
