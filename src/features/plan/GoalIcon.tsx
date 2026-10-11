import { LeafIcon, MoonIcon, PauseIcon, SunsetIcon, WindIcon } from '../../shared/icons';
import type { GoalId } from './goalCatalog';

/** Icon of every goal; keyed by the catalog so a new goal cannot ship without one. */
const GOAL_ICONS: Readonly<Record<GoalId, (props: { className?: string }) => React.JSX.Element>> = {
  relax: LeafIcon,
  rest_before_sleep: MoonIcon,
  calm_after_activity: SunsetIcon,
  slow_breathing: WindIcon,
  pause: PauseIcon,
};

export function GoalIcon({ goal, className }: { readonly goal: GoalId; readonly className?: string }): React.JSX.Element {
  const Icon = GOAL_ICONS[goal];
  return <Icon className={className} />;
}
