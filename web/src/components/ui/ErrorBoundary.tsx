import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/** Stops a render-time exception in any page from blanking the whole application. */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled UI error', error, info.componentStack);
  }

  override render(): ReactNode {
    if (!this.state.error) return this.props.children;

    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-semibold text-ink-900 dark:text-white">Something broke</h1>
        <p className="mt-3 text-sm text-ink-500 dark:text-ink-400">
          An unexpected error stopped this page from rendering. Reloading usually clears it.
        </p>
        <Button className="mt-6" onClick={() => window.location.reload()}>
          Reload the page
        </Button>
      </div>
    );
  }
}
