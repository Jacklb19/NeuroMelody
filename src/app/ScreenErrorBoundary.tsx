import { Component, type ReactNode } from 'react';
import { closeOpenEngines } from '../features/audio/engine/openEngines';
import { useMessages } from '../i18n/messages';
import { PageHeading } from '../shared/PageHeading';

/** Reloads the whole page: the only way back that also brings a screen file that failed to arrive. */
function reloadPage(): void {
  window.location.reload();
}

/** What the person sees instead of a screen that failed: the music is already stopped. */
export function ScreenFailure(): React.JSX.Element {
  const copy = useMessages().app.screenFailure;
  return (
    <div role="alert" className="screen-failure">
      <PageHeading eyebrow={copy.eyebrow} title={copy.title}>
        <p>{copy.text}</p>
      </PageHeading>
      <div className="action-row">
        <button type="button" className="pill-button pill-button-primary" onClick={reloadPage}>{copy.reload}</button>
      </div>
    </div>
  );
}

interface ScreenErrorBoundaryProps {
  readonly children: ReactNode;
  /** When it changes (for example, the person goes to another address) a failed boundary tries again. */
  readonly resetKey?: string;
}

interface ScreenErrorBoundaryState {
  readonly failed: boolean;
}

/**
 * Catches what a screen throws while drawing, including a screen file loaded
 * on first visit that does not arrive (`lazy`). Without it React would leave a
 * blank page, and an engine that was playing would keep sounding with no stop
 * control on screen; so on failure it closes every open audio engine.
 * React only offers this as a class component.
 */
export class ScreenErrorBoundary extends Component<ScreenErrorBoundaryProps, ScreenErrorBoundaryState> {
  override state: ScreenErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ScreenErrorBoundaryState {
    return { failed: true };
  }

  override componentDidCatch(): void {
    void closeOpenEngines();
  }

  override componentDidUpdate(previous: ScreenErrorBoundaryProps): void {
    if (this.state.failed && previous.resetKey !== this.props.resetKey) {
      this.setState({ failed: false });
    }
  }

  override render(): ReactNode {
    return this.state.failed ? <ScreenFailure /> : this.props.children;
  }
}
