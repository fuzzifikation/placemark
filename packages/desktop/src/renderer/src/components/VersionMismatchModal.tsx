/**
 * VersionMismatchModal — shown at startup when the stored app-data version
 * does not match the running app version. Offers the user a choice to wipe
 * all local data (safe reset) or continue with existing data.
 */

import { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import type { Theme } from '../theme';
import { useThemeColors } from '../hooks/useThemeColors';
import {
  SPACING,
  BORDER_RADIUS,
  FONT_SIZE,
  FONT_WEIGHT,
  FONT_FAMILY,
  Z_INDEX,
} from '../constants/ui';

interface VersionMismatchModalProps {
  previousVersion: string;
  currentVersion: string;
  onKeep: () => void;
  theme: Theme;
}

export function VersionMismatchModal({
  previousVersion,
  currentVersion,
  onKeep,
  theme,
}: VersionMismatchModalProps) {
  const colors = useThemeColors(theme);
  const [wiping, setWiping] = useState(false);

  // Escape = keep data and dismiss
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !wiping) onKeep();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onKeep, wiping]);

  const handleWipe = async () => {
    setWiping(true);
    await window.api.system.wipeAndRestart();
    // App will relaunch — this branch is effectively unreachable
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: Z_INDEX.MODAL,
      }}
      onClick={wiping ? undefined : onKeep}
    >
      <div
        style={{
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: BORDER_RADIUS.XL,
          boxShadow: colors.shadow,
          padding: SPACING.XL,
          width: '420px',
          fontFamily: FONT_FAMILY,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: SPACING.MD,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.SM }}>
            <AlertTriangle size={20} color={colors.warning ?? '#f59e0b'} />
            <h2
              style={{
                margin: 0,
                fontSize: FONT_SIZE.LG,
                fontWeight: FONT_WEIGHT.BOLD,
                color: colors.textPrimary,
              }}
            >
              App updated
            </h2>
          </div>
          {!wiping && (
            <button
              onClick={onKeep}
              title="Keep existing data"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: colors.textMuted,
                padding: SPACING.XS,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Version info */}
        <p
          style={{
            margin: `0 0 ${SPACING.SM}`,
            fontSize: FONT_SIZE.SM,
            color: colors.textSecondary,
            lineHeight: 1.5,
          }}
        >
          Placemark was updated from{' '}
          <strong style={{ color: colors.textPrimary }}>{previousVersion}</strong> to{' '}
          <strong style={{ color: colors.textPrimary }}>{currentVersion}</strong>.
        </p>
        <p
          style={{
            margin: `0 0 ${SPACING.LG}`,
            fontSize: FONT_SIZE.SM,
            color: colors.textSecondary,
            lineHeight: 1.5,
          }}
        >
          If the app misbehaves or looks broken, wiping the local database will give you a clean
          start. Your original photo files are never touched — you can re-scan them afterwards.
        </p>

        {/* Actions */}
        <div style={{ display: 'flex', gap: SPACING.SM, justifyContent: 'flex-end' }}>
          <button
            onClick={onKeep}
            disabled={wiping}
            style={{
              padding: `${SPACING.SM} ${SPACING.MD}`,
              borderRadius: BORDER_RADIUS.MD,
              border: `1px solid ${colors.border}`,
              backgroundColor: 'transparent',
              color: colors.textPrimary,
              fontSize: FONT_SIZE.SM,
              fontFamily: FONT_FAMILY,
              cursor: wiping ? 'not-allowed' : 'pointer',
              opacity: wiping ? 0.5 : 1,
            }}
          >
            Keep existing data
          </button>
          <button
            onClick={handleWipe}
            disabled={wiping}
            style={{
              padding: `${SPACING.SM} ${SPACING.MD}`,
              borderRadius: BORDER_RADIUS.MD,
              border: 'none',
              backgroundColor: colors.error,
              color: '#fff',
              fontSize: FONT_SIZE.SM,
              fontFamily: FONT_FAMILY,
              fontWeight: FONT_WEIGHT.MEDIUM,
              cursor: wiping ? 'not-allowed' : 'pointer',
              opacity: wiping ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: SPACING.XS,
            }}
          >
            {wiping ? (
              <>
                <RefreshCw size={14} />
                Wiping…
              </>
            ) : (
              'Wipe data & restart'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
