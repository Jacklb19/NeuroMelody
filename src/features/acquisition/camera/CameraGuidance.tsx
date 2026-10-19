import { useSyncExternalStore } from 'react';
import { useMessages } from '../../../i18n/messages';
import type { SignalSource } from '../contract';
import { CameraSource } from './CameraSource';

/** Announcements follow stable contact states, never image frames or invented readings. */
export function CameraGuidance({ source }: { readonly source: SignalSource | null }): React.JSX.Element {
  const copy = useMessages().insights.camera;
  const camera = source instanceof CameraSource ? source : null;
  const state = useSyncExternalStore((listener) => camera?.subscribeGuidance(listener) ?? (() => undefined), () => camera?.guidance ?? 'inactive');
  return (
    <div className="camera-guidance">
      <p className="secondary-text">{copy.instruction}</p>
      {camera !== null && <p role="status">{copy.states[state]}</p>}
    </div>
  );
}
