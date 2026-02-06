import React from 'react';

type ErrorBoundaryProps = {
  children: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('Unhandled UI error:', error);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
          <div className="max-w-md text-center space-y-4">
            <p className="text-xs uppercase tracking-[0.35em] text-white/60">Urban Prime</p>
            <h1 className="text-3xl font-serif font-bold">We hit a snag.</h1>
            <p className="text-sm text-white/70">
              Something went wrong while rendering this page. Try reloading or come
              back in a moment.
            </p>
            <button
              onClick={this.handleReload}
              className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-white text-black text-xs font-bold uppercase tracking-[0.2em] hover:bg-white/90 transition"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
