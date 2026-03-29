/**
 * AccountsSettings - Connected cloud accounts management
 */

import { useState, useEffect } from 'react';
import { type Theme } from '../../theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import type { OneDriveConnectionStatus } from '../../types/preload';

interface AccountsSettingsProps {
  theme: Theme;
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
  };
}

export function AccountsSettings({ theme, toast }: AccountsSettingsProps) {
  const colors = useThemeColors(theme);
  const [status, setStatus] = useState<OneDriveConnectionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [disconnectConfirm, setDisconnectConfirm] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const s = await window.api.onedrive.getConnectionStatus();
      setStatus(s);
    } catch {
      setStatus({ connected: false, accountEmail: null, expiresAt: null });
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    try {
      const result = await window.api.onedrive.login();
      setStatus(result);
      toast.success('OneDrive connected successfully.');
    } catch (error) {
      toast.error('Could not connect to OneDrive: ' + String(error));
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!disconnectConfirm) {
      setDisconnectConfirm(true);
      return;
    }
    setLoading(true);
    setDisconnectConfirm(false);
    try {
      await window.api.onedrive.logout();
      await loadStatus();
      toast.success('OneDrive disconnected. Access tokens removed from this device.');
    } catch (error) {
      toast.error('Failed to disconnect: ' + String(error));
    } finally {
      setLoading(false);
    }
  };

  const cardStyle = {
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '1rem',
  };

  const primaryButtonStyle = {
    padding: '0.5rem 1.25rem',
    fontSize: '0.875rem',
    backgroundColor: colors.primary,
    color: colors.buttonText,
    border: 'none',
    borderRadius: '4px',
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.6 : 1,
    transition: 'opacity 0.2s ease',
  };

  const destructiveButtonStyle = {
    padding: '0.5rem 1.25rem',
    fontSize: '0.875rem',
    backgroundColor: disconnectConfirm ? '#dc2626' : colors.surface,
    color: disconnectConfirm ? '#ffffff' : colors.textSecondary,
    border: `1px solid ${disconnectConfirm ? '#dc2626' : colors.border}`,
    borderRadius: '4px',
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.6 : 1,
    transition: 'all 0.2s ease',
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem', fontWeight: 600 }}>Accounts</h3>
        <p style={{ margin: 0, color: colors.textSecondary, fontSize: '0.875rem' }}>
          Manage connected cloud accounts for importing photos.
        </p>
      </div>

      {/* OneDrive section */}
      <div style={cardStyle}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
            marginBottom: '0.75rem',
          }}
        >
          {/* OneDrive wordmark icon */}
          <svg width="20" height="14" viewBox="0 0 20 14" fill="none" aria-hidden="true">
            <path
              d="M11.88 5.14A5.002 5.002 0 0 0 2 7H2a4 4 0 0 0 .68 7.97L14 15a4 4 0 0 0 .93-7.89l-.07-.01a5.002 5.002 0 0 0-3-1.96z"
              fill="#0078D4"
            />
          </svg>
          <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: colors.textPrimary }}>
            OneDrive
          </span>
        </div>

        {status === null ? (
          <p style={{ margin: 0, fontSize: '0.875rem', color: colors.textMuted }}>Loading…</p>
        ) : status.connected ? (
          <div>
            <p
              style={{
                margin: '0 0 0.75rem 0',
                fontSize: '0.875rem',
                color: colors.textSecondary,
              }}
            >
              Connected as{' '}
              <strong style={{ color: colors.textPrimary }}>
                {status.accountEmail ?? 'OneDrive account'}
              </strong>
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                style={destructiveButtonStyle}
                onClick={handleDisconnect}
                disabled={loading}
                title={
                  disconnectConfirm
                    ? 'Click again to confirm disconnect'
                    : 'Remove stored access tokens'
                }
              >
                {disconnectConfirm ? 'Confirm disconnect' : 'Disconnect'}
              </button>
              {disconnectConfirm && (
                <button
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '0.8125rem',
                    color: colors.textMuted,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                  onClick={() => setDisconnectConfirm(false)}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        ) : (
          <div>
            <p
              style={{
                margin: '0 0 0.75rem 0',
                fontSize: '0.875rem',
                color: colors.textSecondary,
              }}
            >
              Not connected.
            </p>
            <button style={primaryButtonStyle} onClick={handleConnect} disabled={loading}>
              {loading ? 'Connecting…' : 'Connect OneDrive'}
            </button>
          </div>
        )}
      </div>

      {/* Privacy note */}
      <p
        style={{
          margin: 0,
          fontSize: '0.75rem',
          color: colors.textMuted,
          lineHeight: 1.5,
        }}
      >
        Access tokens are stored locally on this device using OS secure encryption. Placemark never
        sends credentials to its own servers.
      </p>
    </div>
  );
}
