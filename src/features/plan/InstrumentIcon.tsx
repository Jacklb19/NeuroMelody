import { BowlIcon, KeysIcon, WaveIcon } from '../../shared/icons';
import type { InstrumentId } from '../audio/core/instrumentCatalog';

/** Icon of every instrument; keyed by the catalog so a new one cannot ship without an icon. */
const INSTRUMENT_ICONS: Readonly<Record<InstrumentId, typeof WaveIcon>> = {
  warm: WaveIcon,
  piano: KeysIcon,
  bowls: BowlIcon,
};

export function InstrumentIcon({ instrument }: { readonly instrument: InstrumentId }): React.JSX.Element {
  const Icon = INSTRUMENT_ICONS[instrument];
  return <Icon />;
}
