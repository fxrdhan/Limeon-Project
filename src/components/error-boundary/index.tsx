import React, { Component, ReactNode } from 'react';
import { Card } from '@/components/card';
import Button from '@/components/button';
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
        <Card className="p-8 text-center max-w-2xl mx-auto mt-8">
          <div className="mb-6">
            <TbAlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Oops! Terjadi Kesalahan
            </h2>
            <p className="text-gray-600 mb-4">
              Aplikasi mengalami masalah yang tidak terduga. Silakan coba lagi
              atau hubungi tim support jika masalah berlanjut.
            </p>
          </div>

          <div className="flex gap-4 justify-center mb-6">
            <Button
              onClick={this.handleRetry}
              variant="primary"
              className="flex items-center gap-2"
            >
              <TbRefresh className="h-4 w-4" />
              Coba Lagi
            </Button>

            <Button
              onClick={() => window.location.reload()}
              variant="secondary"
            >
              Muat Ulang Halaman
            </Button>
          </div>

          {this.props.showDetails && this.state.error && (
            <details className="text-left bg-gray-50 p-4 rounded-lg">
              <summary className="cursor-pointer font-medium text-gray-700 mb-2">
                Detail Error (untuk Developer)
              </summary>
              <div className="text-xs text-gray-600 space-y-2">
                <div>
                  <strong>Error:</strong> {this.state.error.message}
                </div>
                <div>
                  <strong>Stack:</strong>
                  <pre className="whitespace-pre-wrap text-xs bg-gray-100 p-2 rounded mt-1">
                    {this.state.error.stack}
                  </pre>
                </div>
                {this.state.errorInfo && (
                  <div>
                    <strong>Component Stack:</strong>
                    <pre className="whitespace-pre-wrap text-xs bg-gray-100 p-2 rounded mt-1">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          )}
        </Card>
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
    <Card className="p-6 text-center">
      <TbAlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-3" />
      <p className="text-gray-600 mb-4">{fallbackMessage}</p>
      <Button
        onClick={() => window.location.reload()}
        variant="primary"
        size="sm"
        className="flex items-center gap-2 mx-auto"
      >
        <TbRefresh className="h-4 w-4" />
        Coba Lagi
      </Button>
    </Card>
  );

  return (
    <ErrorBoundary {...props} fallback={queryFallback}>
      {children}
    </ErrorBoundary>
  );
};

export default ErrorBoundary;
