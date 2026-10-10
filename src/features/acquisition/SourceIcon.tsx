import { BluetoothIcon, CameraIcon, FileIcon, WaveIcon } from '../../shared/icons';
import type { SourceKind } from './sourceCatalog';

/** Icon of every signal source; keyed by the catalog so a new source cannot ship without one. */
const SOURCE_ICONS: Readonly<Record<SourceKind, (props: { className?: string }) => React.JSX.Element>> = {
  simulator: WaveIcon,
  recording: FileIcon,
  ble: BluetoothIcon,
  camera: CameraIcon,
};

export function SourceIcon({ source, className }: { readonly source: SourceKind; readonly className?: string }): React.JSX.Element {
  const Icon = SOURCE_ICONS[source];
  return <Icon className={className} />;
}
