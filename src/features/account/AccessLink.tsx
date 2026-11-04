import { Link, useLocation } from 'react-router';
import { accessReturnState } from './accessReturn';

interface AccessLinkProps {
  /** An access screen (sign in or create an account), or the screen that solves what is missing. */
  readonly to: string;
  /** Where to come back after signing in; by default the current screen as it is. */
  readonly returnTo?: string;
  readonly className?: string;
  readonly children: React.ReactNode;
}

/** A link to the access screens that brings the person back here once signed in. */
export function AccessLink({ to, returnTo, className, children }: AccessLinkProps): React.JSX.Element {
  const { pathname, search } = useLocation();
  return (
    <Link to={to} state={accessReturnState(returnTo ?? `${pathname}${search}`)} className={className}>
      {children}
    </Link>
  );
}
