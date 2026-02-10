/**
 * SettingsToggle - Reusable toggle switch component for Settings
 */

import { type Theme } from '../../theme';
import { useThemeColors } from '../../hooks/useThemeColors';

interface SettingsToggleProps {
  label: string;
  value: boolean;
  description?: string;
  onChange: (value: boolean) => void;
  theme: Theme;
}

export function SettingsToggle({
  label,
  value,
  description,
  onChange,
  theme,
}: SettingsToggleProps) {
  const colors = useThemeColors(theme);
  const isDark = theme === 'dark';

  // Toggle switch colors
  const trackBg = value ? '#0066cc' : isDark ? '#334155' : '#cbd5e1';
  const knobColor = '#ffffff';

  return (
    <div style={{ marginBottom: '1rem' }}>
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          fontSize: '0.875rem',
          fontWeight: 500,
          color: colors.textPrimary,
          cursor: 'pointer',
          gap: '0.75rem',
        }}
        onClick={() => onChange(!value)}
      >
        {/* Toggle Switch */}
        <div
          style={{
            position: 'relative',
            width: '44px',
            height: '24px',
            backgroundColor: trackBg,
            borderRadius: '12px',
            transition: 'background-color 0.2s ease',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '2px',
              left: value ? '22px' : '2px',
              width: '20px',
              height: '20px',
              backgroundColor: knobColor,
              borderRadius: '50%',
              transition: 'left 0.2s ease',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}
          />
        </div>
        <span>{label}</span>
      </label>
      {description && (
        <p
          style={{
            fontSize: '0.75rem',
            color: colors.textMuted,
            margin: '0.25rem 0 0 3.25rem',
          }}
        >
          {description}
        </p>
      )}
    </div>
  );
}
