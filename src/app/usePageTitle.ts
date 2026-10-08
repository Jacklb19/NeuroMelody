import { useEffect } from 'react';
import { APP_NAME } from '../config/app';
import { useMessages } from '../i18n/messages';

/**
 * Document title per screen (WCAG 2.4.2): screen readers announce it on
 * navigation. Receives the screen's name from its dictionary and adds the
 * product name.
 */
export function usePageTitle(page: string): void {
  const documentTitle = useMessages().app.documentTitle(page, APP_NAME);
  useEffect(() => {
    document.title = documentTitle;
  }, [documentTitle]);
}
