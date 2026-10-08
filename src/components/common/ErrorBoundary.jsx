import React from 'react';

/**
 * Top-level error boundary so a crashed route never blanks the whole app.
 * Wrapped around <App /> in main.jsx.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message ?? 'Unexpected error' };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info);
  }

  handleReload = () => {
    window.location.href = '/';
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
        <div className="max-w-md w-full bg-white rounded-3xl border border-gray-100 shadow-sm p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 mx-auto flex items-center justify-center text-3xl" aria-hidden="true">
            🍳
          </div>
          <h1 className="text-xl font-black text-gray-900">Something went wrong</h1>
          <p className="text-sm text-gray-500">
            The kitchen is still open — reload the app to continue.
          </p>
          <p className="text-xs text-gray-400 font-mono break-all">{this.state.message}</p>
          <button
            type="button"
            onClick={this.handleReload}
            className="px-6 py-3 rounded-2xl bg-orange-600 text-white font-bold text-sm hover:bg-orange-700 transition"
          >
            Reload app
          </button>
        </div>
      </div>
    );
  }
}
