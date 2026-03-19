/**
 * SettingsNumberInput - Compact number input for developer/advanced settings
 * Single-row layout: label left, input+unit right. Denser than a slider.
 */

import { type Theme } from '../../theme';
import { useThemeColors } from '../../hooks/useThemeColors';

interface SettingsNumberInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  description?: string;
  onChange: (value: number) => void;
  theme: Theme;
}

export function SettingsNumberInput({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  description,
  onChange,
  theme,
}: SettingsNumberInputProps) {
  const colors = useThemeColors(theme);

  const handleChange = (raw: string) => {
    const parsed = parseFloat(raw);
    if (!isNaN(parsed)) {
      onChange(Math.min(max, Math.max(min, parsed)));
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        paddingBottom: '0.625rem',
        marginBottom: '0.625rem',
        borderBottom: `1px solid ${colors.border}`,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: colors.textPrimary }}>
          {label}
        </div>
        {description && (
          <div
            style={{
              fontSize: '0.7rem',
              color: colors.textMuted,
              marginTop: '0.125rem',
              lineHeight: 1.3,
            }}
          >
            {description}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          style={{
            width: '64px',
            padding: '0.25rem 0.375rem',
            fontSize: '0.8125rem',
            fontFamily: 'inherit',
            backgroundColor: colors.background,
            color: colors.textPrimary,
            border: `1px solid ${colors.border}`,
            borderRadius: '4px',
            textAlign: 'right',
            outline: 'none',
          }}
        />
        {unit && (
          <span style={{ fontSize: '0.75rem', color: colors.textMuted, userSelect: 'none' }}>
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}
