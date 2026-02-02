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
        }}
      >
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
          style={{ marginRight: '0.5rem', cursor: 'pointer' }}
        />
        {label}
      </label>
      {description && (
        <p
          style={{
            fontSize: '0.75rem',
            color: colors.textMuted,
            margin: '0.25rem 0 0 1.5rem',
          }}
        >
          {description}
        </p>
      )}
    </div>
  );
}
