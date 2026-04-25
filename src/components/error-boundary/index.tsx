import React, { Component, ReactNode } from 'react';
import { TbAlertTriangle, TbRefresh } from 'react-icons/tb';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  showDetails?: boolean;
}

const RetryAction = ({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors focus:outline-hidden focus:ring-2 ${className ?? ''}`}
  >
    {children}
  </button>
);

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Return custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="mx-auto mt-8 max-w-2xl rounded-xl border border-slate-200 bg-white p-8 text-center shadow-xs">
          <div className="mb-6">
            <div className="text-red-500">
              <TbAlertTriangle
                aria-hidden="true"
                className="mx-auto mb-4 h-16 w-16"
              />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Oops! Terjadi Kesalahan
            </h2>
            <p className="text-slate-600 mb-4">
              Aplikasi mengalami masalah yang tidak terduga. Silakan coba lagi
              atau hubungi tim support jika masalah berlanjut.
            </p>
          </div>

          <div className="flex gap-4 justify-center mb-6">
            <RetryAction
              onClick={this.handleRetry}
              className="bg-primary text-white hover:brightness-95 focus:ring-primary/30"
            >
              <TbRefresh aria-hidden="true" className="h-4 w-4" />
              Coba Lagi
            </RetryAction>

            <RetryAction
              onClick={() => window.location.reload()}
              className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-300"
            >
              Muat Ulang Halaman
            </RetryAction>
          </div>

          {this.props.showDetails && this.state.error && (
            <details className="text-left bg-slate-50 p-4 rounded-xl">
              <summary className="cursor-pointer font-medium text-slate-700 mb-2">
                Detail Error (untuk Developer)
              </summary>
              <div className="text-xs text-slate-600 space-y-2">
                <div>
                  <strong>Error:</strong> {this.state.error.message}
                </div>
                <div>
                  <strong>Stack:</strong>
                  <pre className="whitespace-pre-wrap text-xs bg-slate-100 p-2 rounded mt-1">
                    {this.state.error.stack}
                  </pre>
                </div>
                {this.state.errorInfo && (
                  <div>
                    <strong>Component Stack:</strong>
                    <pre className="whitespace-pre-wrap text-xs bg-slate-100 p-2 rounded mt-1">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC version for easy wrapping
// eslint-disable-next-line react-refresh/only-export-components
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

// Query Error Boundary - specialized for React Query errors
interface QueryErrorBoundaryProps extends Omit<ErrorBoundaryProps, 'fallback'> {
  children: ReactNode;
  fallbackMessage?: string;
}

export const QueryErrorBoundary: React.FC<QueryErrorBoundaryProps> = ({
  children,
  fallbackMessage = 'Gagal memuat data. Silakan coba lagi.',
  ...props
}) => {
  const queryFallback = (
    <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-xs">
      <div className="text-red-500">
        <TbAlertTriangle aria-hidden="true" className="mx-auto mb-3 h-8 w-8" />
      </div>
      <p className="text-slate-600 mb-4">{fallbackMessage}</p>
      <RetryAction
        onClick={() => window.location.reload()}
        className="mx-auto bg-primary text-white hover:brightness-95 focus:ring-primary/30"
      >
        <TbRefresh aria-hidden="true" className="h-4 w-4" />
        Coba Lagi
      </RetryAction>
    </div>
  );

  return (
    <ErrorBoundary {...props} fallback={queryFallback}>
      {children}
    </ErrorBoundary>
  );
};

export default ErrorBoundary;
