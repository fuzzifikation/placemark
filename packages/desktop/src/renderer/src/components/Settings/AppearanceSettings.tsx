/**
 * AppearanceSettings - Theme and visual customization
 */

import { type Theme } from '../../theme';
import { useThemeColors } from '../../hooks/useThemeColors';

interface AppearanceSettingsProps {
  theme: Theme;
  onThemeChange: () => void;
  onReset: () => void;
}

export function AppearanceSettings({ theme, onThemeChange, onReset }: AppearanceSettingsProps) {
  const colors = useThemeColors(theme);

  return (
    <div>
      <div
        style={{
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem', fontWeight: 600 }}>
            🎨 Appearance
          </h3>
          <p style={{ margin: 0, color: colors.textSecondary, fontSize: '0.875rem' }}>
            Customize the look and feel of Placemark
          </p>
        </div>
        <button
          onClick={onReset}
          style={{
            padding: '0.25rem 0.75rem',
            fontSize: '0.75rem',
            backgroundColor: colors.surface,
            color: colors.textSecondary,
            border: `1px solid ${colors.border}`,
            borderRadius: '4px',
            cursor: 'pointer',
          }}
          title="Reset appearance settings"
        >
          Reset
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Theme Toggle */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem',
            backgroundColor: colors.surface,
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
          }}
        >
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 500, color: colors.textPrimary }}>
              Theme
            </div>
            <div style={{ fontSize: '0.75rem', color: colors.textMuted, marginTop: '0.25rem' }}>
              Switch between light and dark mode
            </div>
          </div>
          <button
            onClick={onThemeChange}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '1.25rem',
              backgroundColor: colors.background,
              color: colors.textPrimary,
              border: `1px solid ${colors.border}`,
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </button>
        </div>
      </div>
    </div>
  );
}
