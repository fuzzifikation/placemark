/**
 * ErrorBoundary - Catches React errors and displays fallback UI
 * Prevents entire app crashes from unhandled component errors
 */

import { Component, ReactNode } from 'react';
import { FONT_FAMILY } from '../constants/ui';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: { componentStack?: string } | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(_error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack?: string }): void {
    // Log error details
    console.error('React Error Boundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            padding: '2rem',
            fontFamily: FONT_FAMILY,
            backgroundColor: '#f5f5f5',
          }}
        >
          <div
            style={{
              maxWidth: '600px',
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '2rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <h1 style={{ margin: '0 0 1rem 0', color: '#dc2626' }}>⚠️ Something went wrong</h1>
            <p style={{ color: '#666', marginBottom: '1.5rem' }}>
              An unexpected error occurred in the application. This might be a temporary issue.
            </p>

            {/* Error Details (collapsible) */}
            {this.state.error && (
              <details
                style={{
                  marginBottom: '1.5rem',
                  padding: '1rem',
                  backgroundColor: '#fef2f2',
                  borderRadius: '4px',
                  border: '1px solid #fecaca',
                }}
              >
                <summary
                  style={{
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    color: '#991b1b',
                  }}
                >
                  Error Details
                </summary>
                <div
                  style={{
                    marginTop: '1rem',
                    fontSize: '0.875rem',
                    fontFamily: 'monospace',
                    color: '#7f1d1d',
                  }}
                >
                  <p style={{ margin: '0.5rem 0' }}>
                    <strong>Message:</strong> {this.state.error.message}
                  </p>
                  {this.state.error.stack && (
                    <pre
                      style={{
                        margin: '0.5rem 0 0 0',
                        padding: '0.5rem',
                        backgroundColor: 'white',
                        borderRadius: '4px',
                        overflow: 'auto',
                        maxHeight: '200px',
                        fontSize: '0.75rem',
                      }}
                    >
                      {this.state.error.stack}
                    </pre>
                  )}
                  {this.state.errorInfo?.componentStack && (
                    <details style={{ marginTop: '0.5rem' }}>
                      <summary style={{ cursor: 'pointer', fontSize: '0.875rem' }}>
                        Component Stack
                      </summary>
                      <pre
                        style={{
                          margin: '0.5rem 0 0 0',
                          padding: '0.5rem',
                          backgroundColor: 'white',
                          borderRadius: '4px',
                          overflow: 'auto',
                          maxHeight: '150px',
                          fontSize: '0.75rem',
                        }}
                      >
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              </details>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={this.handleReset}
                style={{
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e5e7eb')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                style={{
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1d4ed8')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
              >
                Reload Application
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
