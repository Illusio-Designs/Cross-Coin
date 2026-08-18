import React from 'react';

/**
 * Whole-app error boundary.
 *
 * Rendered once near the root in _app.jsx. Catches every render-time
 * exception below it so a single bad component never blanks the whole
 * site. On error:
 *   - Logs to console + window.__crosscoinErrors so Sentry/Datadog
 *     can pick it up later without a code change.
 *   - Shows brand-consistent copy + 3 actions: retry, go home, copy
 *     error to clipboard for support.
 *   - In dev, expands the stack trace.
 *
 * Note: this only catches RENDER errors. Async errors in effects /
 * event handlers are caught by the axios interceptor in
 * utils/apiInterceptors.js — those surface as toasts instead.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      copied: false,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState(prev => ({
      errorInfo,
      errorCount: prev.errorCount + 1,
    }));

    if (typeof window !== 'undefined') {
      // Buffer recent errors on window so an external monitor (Sentry,
      // Datadog, etc.) can drain them when it loads. Keep at most 20
      // so we never accumulate without bound.
      window.__crosscoinErrors = window.__crosscoinErrors || [];
      window.__crosscoinErrors.push({
        message: error?.toString(),
        stack: errorInfo?.componentStack,
        href: window.location.href,
        at: new Date().toISOString(),
      });
      if (window.__crosscoinErrors.length > 20) window.__crosscoinErrors.shift();

      // Also dispatch a custom event so a monitor can react in real time.
      try {
        window.dispatchEvent(new CustomEvent('crosscoin:error', { detail: { error, errorInfo } }));
      } catch { /* ignore */ }
    }

    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error('ErrorBoundary caught:', error);
      // eslint-disable-next-line no-console
      console.error('Component stack:', errorInfo?.componentStack);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, copied: false });
  };

  handleCopy = async () => {
    try {
      const payload = [
        'CrossCoin error report',
        '----------------------',
        `URL: ${typeof window !== 'undefined' ? window.location.href : 'N/A'}`,
        `Time: ${new Date().toISOString()}`,
        `Error: ${this.state.error?.toString() || 'Unknown'}`,
        '',
        'Component stack:',
        this.state.errorInfo?.componentStack || '(none)',
      ].join('\n');
      await navigator.clipboard.writeText(payload);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch {
      this.setState({ copied: false });
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorContent} role="alert" aria-live="assertive">
          <div style={styles.icon} aria-hidden="true">⚠️</div>
          <h1 style={styles.title}>Something went wrong</h1>
          <p style={styles.subtitle}>
            We've logged the issue and will look into it. You can retry, head back home, or copy the details to share with our team.
          </p>

          <div style={styles.buttonContainer}>
            <button onClick={this.handleReset} style={{ ...styles.button, ...styles.buttonPrimary }} autoFocus>
              Try again
            </button>
            <button onClick={() => { window.location.href = '/'; }} style={{ ...styles.button, ...styles.buttonSecondary }}>
              Go home
            </button>
            <button onClick={this.handleCopy} style={{ ...styles.button, ...styles.buttonGhost }}>
              {this.state.copied ? '✓ Copied' : 'Copy details'}
            </button>
          </div>

          <p style={styles.support}>
            Still stuck? <a href="mailto:obzusindia@gmail.com" style={styles.link}>obzusindia@gmail.com</a>
            {' · '}
            <a href="https://wa.me/917434834000" target="_blank" rel="noopener noreferrer" style={styles.link}>WhatsApp us</a>
          </p>

          {process.env.NODE_ENV !== 'production' && (
            <details style={styles.details}>
              <summary style={styles.summary}>Stack trace (dev only)</summary>
              <pre style={styles.errorText}>
                {this.state.error?.toString()}
                {'\n\n'}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}

const styles = {
  errorContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#fafafa',
    padding: '20px',
    fontFamily: 'DM Sans, system-ui, -apple-system, sans-serif',
  },
  errorContent: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    boxShadow: '0 12px 40px rgba(24, 13, 62, 0.08)',
    padding: '48px 40px',
    maxWidth: '560px',
    textAlign: 'center',
  },
  icon: {
    fontSize: '48px',
    marginBottom: '12px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#180D3E',
    margin: '0 0 12px 0',
  },
  subtitle: {
    fontSize: '15px',
    color: '#6b7280',
    margin: '0 0 28px 0',
    lineHeight: 1.6,
  },
  buttonContainer: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: '20px',
  },
  button: {
    padding: '11px 22px',
    borderRadius: '8px',
    border: '1px solid transparent',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.15s ease',
  },
  buttonPrimary: { background: '#CE1E36', color: '#fff' },
  buttonSecondary: { background: '#180D3E', color: '#fff' },
  buttonGhost: { background: '#fff', color: '#180D3E', borderColor: '#e5e7eb' },
  support: {
    fontSize: '13px',
    color: '#6b7280',
    margin: '8px 0 0 0',
  },
  link: { color: '#CE1E36', textDecoration: 'underline' },
  details: {
    marginTop: '24px',
    textAlign: 'left',
    backgroundColor: '#f3f4f6',
    padding: '12px',
    borderRadius: '8px',
  },
  summary: {
    cursor: 'pointer',
    fontWeight: 600,
    color: '#374151',
    fontSize: '13px',
  },
  errorText: {
    backgroundColor: '#fff',
    padding: '12px',
    borderRadius: '6px',
    overflow: 'auto',
    maxHeight: '300px',
    fontSize: '12px',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    color: '#ef4444',
    margin: '8px 0 0 0',
    whiteSpace: 'pre-wrap',
  },
};

export default ErrorBoundary;
