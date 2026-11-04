import { useSyncExternalStore } from 'react';
import { useMessages } from '../../../i18n/messages';
import type { SignalSource } from '../contract';
import { CameraSource } from './CameraSource';

/**
 * The back of the phone with the index fingertip settling over the lens and the flashlight.
 * Its resting pose is the covering one, so with reduced motion it still shows where the finger goes.
 */
function FingerPlacement({ label }: { readonly label: string }): React.JSX.Element {
  return (
    <svg className="finger-placement" viewBox="0 0 120 150" role="img" aria-label={label}>
      <rect className="finger-placement-phone" x="22" y="10" width="76" height="132" rx="12" />
      <rect className="finger-placement-module" x="32" y="20" width="30" height="40" rx="7" />
      <circle className="finger-placement-lens" cx="47" cy="32" r="7" />
      <circle className="finger-placement-flash" cx="47" cy="50" r="3.5" />
      <g className="finger-placement-finger">
        <path d="M33 -40 V34 a14 14 0 0 0 28 0 V-40 Z" />
        <path className="finger-placement-nail" d="M39 18 a8 8 0 0 0 16 0 V10 H39 Z" />
      </g>
    </svg>
  );
}

/** Announcements follow stable contact states, never image frames or invented readings. */
export function CameraGuidance({ source }: { readonly source: SignalSource | null }): React.JSX.Element {
  const copy = useMessages().insights.camera;
  const camera = source instanceof CameraSource ? source : null;
  const state = useSyncExternalStore((listener) => camera?.subscribeGuidance(listener) ?? (() => undefined), () => camera?.guidance ?? 'inactive');
  return (
    <div className="camera-guidance">
      {state !== 'receiving' && (
        <div className="camera-guidance-figure">
          <FingerPlacement label={copy.figure} />
          <p className="secondary-text">{copy.finger}</p>
        </div>
      )}
      <p className="secondary-text">{copy.instruction}</p>
      {camera !== null && <p role="status">{copy.states[state]}</p>}
    </div>
  );
}
