import { useMemo } from 'react';
import { useFormatters, useMessages } from '../../i18n/messages';
import { createRecordFormatter, type RecordFormatter } from './formatRecord';

/** Record formatter of the current interface language. */
export function useRecordFormatter(): RecordFormatter {
  const t = useMessages();
  const format = useFormatters();
  return useMemo(() => createRecordFormatter(t, format), [t, format]);
}
