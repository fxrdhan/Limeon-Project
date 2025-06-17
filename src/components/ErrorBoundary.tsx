import { Component, ReactNode, ErrorInfo } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static getDerivedStateFromError(_: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // You can also log the error to an error reporting service
    console.error("Uncaught error in ErrorBoundary:", error, errorInfo);
    // It's also good to store the error and errorInfo in state
    // if you want to display more detailed error information in your fallback UI.
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });
    // Example: logErrorToMyService(error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      // You can also access this.state.error and this.state.errorInfo here
      // to provide more context about the error.
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div>
          <h2>Something went wrong.</h2>
          {/*
            You might want to display more details in development,
            but be cautious about exposing too much in production.
            Example for development:
            <details style={{ whiteSpace: 'pre-wrap' }}>
              {this.state.error && this.state.error.toString()}
              <br />
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </details>
          */}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
