import { NoteIcon, RainIcon, SeaIcon, WindIcon } from '../../shared/icons';
import type { AmbienceId } from '../audio/core/ambienceCatalog';

/** Icon of every ambience; keyed by the catalog so a new one cannot ship without an icon. */
const AMBIENCE_ICONS: Readonly<Record<AmbienceId, typeof NoteIcon>> = {
  none: NoteIcon,
  rain: RainIcon,
  sea: SeaIcon,
  wind: WindIcon,
};

export function AmbienceIcon({ ambience }: { readonly ambience: AmbienceId }): React.JSX.Element {
  const Icon = AMBIENCE_ICONS[ambience];
  return <Icon />;
}
