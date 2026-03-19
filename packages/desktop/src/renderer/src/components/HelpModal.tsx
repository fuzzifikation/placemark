/**
 * HelpModal - keyboard shortcuts and usage reference
 * Opened via the ? button in the floating header.
 */

import { useEffect } from 'react';
import { X, Lasso } from 'lucide-react';
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

interface HelpModalProps {
  onClose: () => void;
  theme: Theme;
}

interface ShortcutRowProps {
  keys: React.ReactNode[];
  description: string;
  keyBg: string;
  keyBorder: string;
  textPrimary: string;
  textSecondary: string;
}

function ShortcutRow({
  keys,
  description,
  keyBg,
  keyBorder,
  textPrimary,
  textSecondary,
}: ShortcutRowProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: SPACING.MD,
        padding: `${SPACING.XS} 0`,
      }}
    >
      <span style={{ fontSize: FONT_SIZE.SM, color: textSecondary, fontFamily: FONT_FAMILY }}>
        {description}
      </span>
      <div style={{ display: 'flex', gap: SPACING.XS, flexShrink: 0 }}>
        {keys.map((k, i) => (
          <kbd
            key={i}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: `2px 7px`,
              backgroundColor: keyBg,
              border: `1px solid ${keyBorder}`,
              borderRadius: BORDER_RADIUS.SM,
              fontSize: FONT_SIZE.XS,
              fontWeight: FONT_WEIGHT.MEDIUM,
              fontFamily: 'monospace, monospace',
              color: textPrimary,
              whiteSpace: 'nowrap',
            }}
          >
            {k}
          </kbd>
        ))}
      </div>
    </div>
  );
}

export function HelpModal({ onClose, theme }: HelpModalProps) {
  const colors = useThemeColors(theme);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const isDark = theme === 'dark';
  const keyBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const keyBorder = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)';

  const sectionLabel: React.CSSProperties = {
    fontSize: FONT_SIZE.XS,
    fontWeight: FONT_WEIGHT.BOLD,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    fontFamily: FONT_FAMILY,
    marginBottom: SPACING.XS,
    marginTop: SPACING.MD,
  };

  const divider: React.CSSProperties = {
    height: '1px',
    backgroundColor: colors.border,
    margin: `${SPACING.MD} 0`,
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: Z_INDEX.MODAL,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: BORDER_RADIUS.XL,
          boxShadow: colors.shadow,
          padding: SPACING.XL,
          width: '400px',
          maxHeight: '80vh',
          overflowY: 'auto',
          fontFamily: FONT_FAMILY,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: SPACING.LG,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: FONT_SIZE.LG,
              fontWeight: FONT_WEIGHT.BOLD,
              color: colors.textPrimary,
            }}
          >
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: colors.textMuted,
              padding: SPACING.XS,
              borderRadius: BORDER_RADIUS.FULL,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Selection */}
        <p style={sectionLabel}>Selection Mode</p>
        <ShortcutRow
          keys={[<Lasso size={14} />]}
          description="Enter / exit lasso mode"
          keyBg={keyBg}
          keyBorder={keyBorder}
          textPrimary={colors.textPrimary}
          textSecondary={colors.textSecondary}
        />
        <ShortcutRow
          keys={['Drag']}
          description="Draw selection area"
          keyBg={keyBg}
          keyBorder={keyBorder}
          textPrimary={colors.textPrimary}
          textSecondary={colors.textSecondary}
        />
        <ShortcutRow
          keys={['Shift', 'Drag']}
          description="Add to selection"
          keyBg={keyBg}
          keyBorder={keyBorder}
          textPrimary={colors.textPrimary}
          textSecondary={colors.textSecondary}
        />
        <ShortcutRow
          keys={['Alt', 'Drag']}
          description="Remove from selection"
          keyBg={keyBg}
          keyBorder={keyBorder}
          textPrimary={colors.textPrimary}
          textSecondary={colors.textSecondary}
        />
        <ShortcutRow
          keys={['Esc']}
          description="Cancel in-progress draw"
          keyBg={keyBg}
          keyBorder={keyBorder}
          textPrimary={colors.textPrimary}
          textSecondary={colors.textSecondary}
        />

        <div style={divider} />

        {/* Map navigation */}
        <p style={sectionLabel}>Map Navigation</p>
        <ShortcutRow
          keys={['Scroll']}
          description="Zoom in / out"
          keyBg={keyBg}
          keyBorder={keyBorder}
          textPrimary={colors.textPrimary}
          textSecondary={colors.textSecondary}
        />
        <ShortcutRow
          keys={['Drag']}
          description="Pan map"
          keyBg={keyBg}
          keyBorder={keyBorder}
          textPrimary={colors.textPrimary}
          textSecondary={colors.textSecondary}
        />
        <ShortcutRow
          keys={['Right-drag']}
          description="Rotate & tilt"
          keyBg={keyBg}
          keyBorder={keyBorder}
          textPrimary={colors.textPrimary}
          textSecondary={colors.textSecondary}
        />
        <ShortcutRow
          keys={['Click pin']}
          description="Preview photo"
          keyBg={keyBg}
          keyBorder={keyBorder}
          textPrimary={colors.textPrimary}
          textSecondary={colors.textSecondary}
        />
        <ShortcutRow
          keys={[
            <svg
              width="14"
              height="14"
              viewBox="0 0 18 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M1 6V1h5M12 1h5v5M1 12v5h5M17 12v5h-5"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>,
          ]}
          description="Zoom to all photos (or selection)"
          keyBg={keyBg}
          keyBorder={keyBorder}
          textPrimary={colors.textPrimary}
          textSecondary={colors.textSecondary}
        />
      </div>
    </div>
  );
}
