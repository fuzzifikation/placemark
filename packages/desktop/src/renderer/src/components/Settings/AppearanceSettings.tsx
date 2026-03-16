/**
 * AppearanceSettings - Theme and visual customization
 */

import { useState } from 'react';
import { type Theme } from '../../theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SettingsSection } from './SettingsSection';
import { SettingsSlider } from './SettingsSlider';
import type { AppSettings } from '../Settings';

interface AppearanceSettingsProps {
  theme: Theme;
  settings: AppSettings;
  onSettingChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  onThemeChange: () => void;
  onReset: () => void;
}

export function AppearanceSettings({
  theme,
  settings,
  onSettingChange,
  onThemeChange,
  onReset,
}: AppearanceSettingsProps) {
  const colors = useThemeColors(theme);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    advanced: false,
  });

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

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
            Appearance
          </h3>
          <p style={{ margin: 0, color: colors.textSecondary, fontSize: '0.875rem' }}>
            Customize the app's look and feel
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

        <SettingsSection
          title="Advanced"
          expanded={expandedSections.advanced}
          onToggle={() => toggleSection('advanced')}
          theme={theme}
          isAdvanced
        >
          <SettingsSlider
            label="Notification Duration"
            value={settings.toastDuration}
            min={1000}
            max={10000}
            step={500}
            unit="ms"
            minLabel="Quick (1s)"
            maxLabel="Long (10s)"
            description="How long notifications stay visible before fading out"
            onChange={(val) => onSettingChange('toastDuration', val)}
            theme={theme}
          />
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: colors.textMuted,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              paddingTop: '0.5rem',
              borderTop: `1px solid ${colors.border}`,
              marginTop: '0.25rem',
            }}
          >
            Window Style
          </div>
          <SettingsSlider
            label="Blur Strength"
            value={settings.glassBlur}
            min={0}
            max={30}
            step={1}
            unit="px"
            minLabel="None (0px)"
            maxLabel="Maximum (30px)"
            onChange={(val) => onSettingChange('glassBlur', val)}
            theme={theme}
          />
          <SettingsSlider
            label="Surface Opacity"
            value={settings.glassSurfaceOpacity}
            min={20}
            max={100}
            step={5}
            unit="%"
            minLabel="Transparent (20%)"
            maxLabel="Opaque (100%)"
            onChange={(val) => onSettingChange('glassSurfaceOpacity', val)}
            theme={theme}
          />
        </SettingsSection>
      </div>
    </div>
  );
}
