import React from 'react';

interface State {
  hasError: boolean;
}

interface Props {
  children: React.ReactNode;
}

export class AppErrorBoundary extends React.Component<Props, State> {
  declare readonly props: Props;
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[Amrut CRM] Unhandled render error', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <section className="w-full max-w-md bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
            <h1 className="text-lg font-semibold text-slate-900">CRM could not load</h1>
            <p className="mt-2 text-sm text-slate-600">
              Your session is valid, but the workspace encountered an unexpected error.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 px-4 py-2 rounded-md bg-blue-600 text-sm font-medium text-white hover:bg-blue-700"
            >
              Reload workspace
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
