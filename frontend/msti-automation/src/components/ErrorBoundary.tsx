import React, { Component, ReactNode } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="flex flex-col items-center justify-center p-6 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            {this.props.componentName ? `${this.props.componentName} Error` : 'Component Error'}
          </h3>
          
          <p className="text-red-700 text-center mb-4">
            Terjadi kesalahan saat memuat komponen visualisasi.
          </p>
          
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="w-full">
              <summary className="cursor-pointer text-sm text-red-600 mb-2">
                Detail Error (Development)
              </summary>
              <div className="bg-red-100 p-3 rounded text-xs font-mono text-red-800 overflow-auto max-h-40">
                <div className="font-bold mb-2">Error:</div>
                <div className="mb-2">{this.state.error.message}</div>
                <div className="font-bold mb-2">Stack:</div>
                <div className="whitespace-pre-wrap">{this.state.error.stack}</div>
                {this.state.errorInfo && (
                  <>
                    <div className="font-bold mb-2 mt-4">Component Stack:</div>
                    <div className="whitespace-pre-wrap">{this.state.errorInfo.componentStack}</div>
                  </>
                )}
              </div>
            </details>
          )}
          
          <button
            onClick={() => {
              this.setState({ hasError: false, error: undefined, errorInfo: undefined });
            }}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Coba Lagi
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 