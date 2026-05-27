import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState(prev => ({
      errorInfo,
      errorCount: prev.errorCount + 1
    }));

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error);
      console.error('Error Info:', errorInfo);
    }

    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to error tracking service (Sentry, etc.)
      this.logErrorToService(error, errorInfo);
    }
  }

  logErrorToService = (error, errorInfo) => {
    try {
      // Placeholder for error logging service
      const errorData = {
        message: error?.toString(),
        stack: errorInfo?.componentStack,
        timestamp: new Date().toISOString(),
        url: typeof window !== 'undefined' ? window.location.href : 'N/A'
      };
      // fetch('/api/errors', { method: 'POST', body: JSON.stringify(errorData) });
    } catch (e) {
      console.error('Failed to log error:', e);
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.errorContainer}>
          <div style={styles.errorContent}>
            <h1 style={styles.title}>❌ Something Went Wrong</h1>
            <p style={styles.subtitle}>
              We encountered an unexpected error. Please try again or contact support.
            </p>

            {process.env.NODE_ENV === 'development' && (
              <details style={styles.details}>
                <summary style={styles.summary}>Error Details (Dev Only)</summary>
                <pre style={styles.errorText}>
                  {this.state.error?.toString()}
                  {'\n\n'}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div style={styles.buttonContainer}>
              <button
                onClick={this.handleReset}
                style={{...styles.button, ...styles.buttonPrimary}}
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/'}
                style={{...styles.button, ...styles.buttonSecondary}}
              >
                Go Home
              </button>
            </div>

            <p style={styles.errorCount}>
              Error #{this.state.errorCount}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const styles = {
  errorContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
    padding: '20px',
  },
  errorContent: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    padding: '40px',
    maxWidth: '600px',
    textAlign: 'center',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: '0 0 12px 0',
  },
  subtitle: {
    fontSize: '16px',
    color: '#6b7280',
    margin: '0 0 24px 0',
    lineHeight: '1.5',
  },
  details: {
    marginBottom: '24px',
    textAlign: 'left',
    backgroundColor: '#f3f4f6',
    padding: '12px',
    borderRadius: '4px',
  },
  summary: {
    cursor: 'pointer',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '8px',
  },
  errorText: {
    backgroundColor: '#ffffff',
    padding: '12px',
    borderRadius: '4px',
    overflow: 'auto',
    maxHeight: '300px',
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#ef4444',
    margin: '8px 0 0 0',
  },
  buttonContainer: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    marginBottom: '16px',
  },
  button: {
    padding: '10px 20px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  buttonPrimary: {
    backgroundColor: '#3b82f6',
    color: 'white',
  },
  buttonSecondary: {
    backgroundColor: '#e5e7eb',
    color: '#1f2937',
  },
  errorCount: {
    fontSize: '12px',
    color: '#9ca3af',
    margin: '0',
  },
};

export default ErrorBoundary;
