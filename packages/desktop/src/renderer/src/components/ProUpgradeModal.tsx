import { useEffect } from 'react';
import { Check, Crown, X } from 'lucide-react';
import type { Theme } from '../theme';
import { useThemeColors } from '../hooks/useThemeColors';
import {
  BORDER_RADIUS,
  FONT_FAMILY,
  FONT_SIZE,
  FONT_WEIGHT,
  SPACING,
  Z_INDEX,
} from '../constants/ui';

interface ProUpgradeModalProps {
  onClose: () => void;
  onUpgrade: () => void;
  theme: Theme;
}

const BENEFITS = [
  'Unlimited photos',
  'Copy, move, and undo with confidence',
  'Select photos directly on the map',
  'GPS editing included when it ships',
];

export function ProUpgradeModal({ onClose, onUpgrade, theme }: ProUpgradeModalProps) {
  const colors = useThemeColors(theme);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: colors.overlay,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: Z_INDEX.MODAL,
        fontFamily: FONT_FAMILY,
        padding: SPACING.LG,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          backgroundColor: colors.modalBackground,
          color: colors.textPrimary,
          border: `1px solid ${colors.border}`,
          borderRadius: BORDER_RADIUS.XL,
          boxShadow: colors.shadow,
          padding: SPACING.XL,
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: SPACING.MD,
            marginBottom: SPACING.LG,
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: SPACING.XS,
                padding: '0.35rem 0.65rem',
                borderRadius: '999px',
                backgroundColor: colors.surfaceHover,
                color: colors.primary,
                fontSize: FONT_SIZE.XS,
                fontWeight: FONT_WEIGHT.BOLD,
                marginBottom: SPACING.MD,
              }}
            >
              <Crown size={14} />
              Placemark Pro
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: FONT_SIZE.XL,
                fontWeight: FONT_WEIGHT.BOLD,
                color: colors.textPrimary,
              }}
            >
              Unlock Placemark Pro
            </h2>
            <p
              style={{
                margin: `${SPACING.SM} 0 0 0`,
                fontSize: FONT_SIZE.SM,
                lineHeight: 1.6,
                color: colors.textSecondary,
              }}
            >
              One-time purchase. Includes all future Pro features.
            </p>
          </div>

          <button
            onClick={onClose}
            title="Close"
            style={{
              background: 'transparent',
              border: 'none',
              color: colors.textMuted,
              cursor: 'pointer',
              padding: SPACING.XS,
              borderRadius: BORDER_RADIUS.FULL,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div
          style={{
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: BORDER_RADIUS.LG,
            padding: SPACING.LG,
            marginBottom: SPACING.LG,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.SM }}>
            {BENEFITS.map((benefit) => (
              <div
                key={benefit}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: SPACING.SM,
                  color: colors.textSecondary,
                  fontSize: FONT_SIZE.SM,
                  lineHeight: 1.5,
                }}
              >
                <span
                  style={{
                    width: '1.25rem',
                    height: '1.25rem',
                    borderRadius: BORDER_RADIUS.FULL,
                    backgroundColor: colors.primary,
                    color: colors.buttonText,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '1px',
                  }}
                >
                  <Check size={12} />
                </span>
                <span>{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        <p
          style={{
            margin: `0 0 ${SPACING.LG} 0`,
            fontSize: FONT_SIZE.SM,
            color: colors.textSecondary,
            lineHeight: 1.6,
          }}
        >
          No subscription. Pay once. Keep Pro forever.
        </p>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: SPACING.SM,
            flexWrap: 'wrap',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '0.7rem 1rem',
              borderRadius: BORDER_RADIUS.MD,
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.surface,
              color: colors.textSecondary,
              cursor: 'pointer',
              fontSize: FONT_SIZE.SM,
              fontWeight: FONT_WEIGHT.MEDIUM,
            }}
          >
            Not now
          </button>
          <button
            onClick={onUpgrade}
            style={{
              padding: '0.7rem 1rem',
              borderRadius: BORDER_RADIUS.MD,
              border: 'none',
              backgroundColor: colors.buttonBackground,
              color: colors.buttonText,
              cursor: 'pointer',
              fontSize: FONT_SIZE.SM,
              fontWeight: FONT_WEIGHT.BOLD,
            }}
          >
            Unlock Pro — $12.99
          </button>
        </div>
      </div>
    </div>
  );
}
