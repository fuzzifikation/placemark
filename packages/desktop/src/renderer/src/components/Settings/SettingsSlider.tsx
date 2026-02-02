/**
 * SettingsSlider - Reusable slider component for Settings
 */

import { type Theme } from '../../theme';
import { useThemeColors } from '../../hooks/useThemeColors';

interface SettingsSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  description?: string;
  minLabel?: string;
  maxLabel?: string;
  onChange: (value: number) => void;
  theme: Theme;
}

export function SettingsSlider({
  label,
  value,
  min,
  max,
  step,
  unit = '',
  description,
  minLabel,
  maxLabel,
  onChange,
  theme,
}: SettingsSliderProps) {
  const colors = useThemeColors(theme);

  return (
    <div style={{ marginBottom: '1rem' }}>
      <label
        style={{
          display: 'block',
          fontSize: '0.875rem',
          fontWeight: 500,
          marginBottom: '0.5rem',
          color: colors.textPrimary,
        }}
      >
        {label}:{' '}
        <strong>
          {value}
          {unit}
        </strong>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        style={{ width: '100%' }}
      />
      {(minLabel || maxLabel) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.7rem',
            color: colors.textMuted,
            marginTop: '0.25rem',
          }}
        >
          <span>{minLabel || min}</span>
          <span>{maxLabel || max}</span>
        </div>
      )}
      {description && (
        <p
          style={{
            fontSize: '0.75rem',
            color: colors.textMuted,
            margin: '0.5rem 0 0 0',
          }}
        >
          {description}
        </p>
      )}
    </div>
  );
}
