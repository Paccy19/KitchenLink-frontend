import React from 'react';
import { ChefHat } from 'lucide-react';

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
      <div className="min-h-screen flex items-center justify-center bg-stone-50 px-6">
        <div className="max-w-md w-full bg-white rounded-3xl border border-stone-200 shadow-xl p-8 text-center space-y-4 animate-scale-in">
          <div className="w-16 h-16 rounded-2xl bg-[#faf6f2] text-[#542813] border border-[#ebd7c5] mx-auto flex items-center justify-center shadow-sm" aria-hidden="true">
            <ChefHat className="w-8 h-8 text-[#542813]" />
          </div>
          <h1 className="text-xl font-black text-gray-900">Something went wrong</h1>
          <p className="text-sm text-stone-500">
            The kitchen is still open — reload the app to continue.
          </p>
          <p className="text-xs text-stone-400 font-mono break-all">{this.state.message}</p>
          <button
            type="button"
            onClick={this.handleReload}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] hover:from-[#3d1b0c] hover:via-[#5c2810] hover:to-[#2c1206] text-white font-bold text-sm shadow-md shadow-[#2b1206]/20 transition-all active:scale-95"
          >
            Reload app
          </button>
        </div>
      </div>
    );
  }
}
