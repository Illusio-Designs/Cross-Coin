'use client';

import React from 'react';

/**
 * Whole-app error boundary for Velquira.
 *
 * Catches render errors below it so a single bad component never
 * blanks the entire site. Buffers errors onto window.__velquiraErrors
 * for any monitor to drain, and dispatches a 'velquira:error'
 * CustomEvent for real-time pickup.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, copied: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    if (typeof window !== 'undefined') {
      window.__velquiraErrors = window.__velquiraErrors || [];
      window.__velquiraErrors.push({
        message: error?.toString(),
        stack: errorInfo?.componentStack,
        href: window.location.href,
        at: new Date().toISOString(),
      });
      if (window.__velquiraErrors.length > 20) window.__velquiraErrors.shift();
      try { window.dispatchEvent(new CustomEvent('velquira:error', { detail: { error, errorInfo } })); } catch { /* ignore */ }
    }
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error('ErrorBoundary caught:', error);
      // eslint-disable-next-line no-console
      console.error('Component stack:', errorInfo?.componentStack);
    }
  }

  handleReset = () => this.setState({ hasError: false, error: null, errorInfo: null, copied: false });

  handleCopy = async () => {
    try {
      const payload = [
        'Velquira error report',
        '---------------------',
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
    } catch { this.setState({ copied: false }); }
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div style={styles.container}>
        <div style={styles.content} role="alert" aria-live="assertive">
          <div style={styles.icon} aria-hidden="true">⚠️</div>
          <h1 style={styles.title}>Something went wrong</h1>
          <p style={styles.subtitle}>
            We&apos;ve logged the issue and will look into it. Try again, head home, or copy the details to share with our team.
          </p>
          <div style={styles.buttonContainer}>
            <button onClick={this.handleReset} style={{ ...styles.button, ...styles.buttonPrimary }} autoFocus>Try again</button>
            <button onClick={() => { window.location.href = '/'; }} style={{ ...styles.button, ...styles.buttonSecondary }}>Go home</button>
            <button onClick={this.handleCopy} style={{ ...styles.button, ...styles.buttonGhost }}>{this.state.copied ? '✓ Copied' : 'Copy details'}</button>
          </div>
          <p style={styles.support}>Still stuck? <a href="mailto:support@velquira.com" style={styles.link}>support@velquira.com</a></p>
          {process.env.NODE_ENV !== 'production' && (
            <details style={styles.details}>
              <summary style={styles.summary}>Stack trace (dev only)</summary>
              <pre style={styles.errorText}>{this.state.error?.toString()}{'\n\n'}{this.state.errorInfo?.componentStack}</pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}

const styles = {
  container: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#FAF7F2', padding: '20px' },
  content: { backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 12px 40px rgba(0,0,0,.06)', padding: '48px 40px', maxWidth: '560px', textAlign: 'center' },
  icon: { fontSize: '48px', marginBottom: '12px' },
  title: { fontSize: '28px', fontWeight: 700, color: '#1a1a1a', margin: '0 0 12px 0' },
  subtitle: { fontSize: '15px', color: '#6b7280', margin: '0 0 28px 0', lineHeight: 1.6 },
  buttonContainer: { display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '20px' },
  button: { padding: '11px 22px', borderRadius: '8px', border: '1px solid transparent', fontSize: '14px', fontWeight: 600, cursor: 'pointer' },
  buttonPrimary: { background: '#1a1a1a', color: '#fff' },
  buttonSecondary: { background: '#8B7355', color: '#fff' },
  buttonGhost: { background: '#fff', color: '#1a1a1a', borderColor: '#e5e7eb' },
  support: { fontSize: '13px', color: '#6b7280', margin: '8px 0 0 0' },
  link: { color: '#8B7355', textDecoration: 'underline' },
  details: { marginTop: '24px', textAlign: 'left', backgroundColor: '#f3f4f6', padding: '12px', borderRadius: '8px' },
  summary: { cursor: 'pointer', fontWeight: 600, color: '#374151', fontSize: '13px' },
  errorText: { backgroundColor: '#fff', padding: '12px', borderRadius: '6px', overflow: 'auto', maxHeight: '300px', fontSize: '12px', fontFamily: 'ui-monospace, Menlo, monospace', color: '#ef4444', margin: '8px 0 0 0', whiteSpace: 'pre-wrap' },
};

export default ErrorBoundary;
