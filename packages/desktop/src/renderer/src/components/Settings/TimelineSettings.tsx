/**
 * TimelineSettings - Timeline playback configuration
 */

import { type Theme } from '../../theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SettingsSection } from './SettingsSection';
import { SettingsToggle } from './SettingsToggle';
import type { AppSettings } from '../Settings';

interface TimelineSettingsProps {
  theme: Theme;
  settings: AppSettings;
  onSettingChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  onReset: () => void;
}

export function TimelineSettings({
  theme,
  settings,
  onSettingChange,
  onReset,
}: TimelineSettingsProps) {
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
            ⏱️ Timeline
          </h3>
          <p style={{ margin: 0, color: colors.textSecondary, fontSize: '0.875rem' }}>
            Control timeline behavior and playback settings
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
          title="Reset timeline settings"
        >
          Reset
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <SettingsSection
          title="Playback Settings"
          expanded={true}
          onToggle={() => {}}
          theme={theme}
        >
          <SettingsToggle
            label="Auto-fit map during playback"
            value={settings.autoZoomDuringPlay}
            description="Map will automatically zoom and pan to follow your journey"
            onChange={(value) => onSettingChange('autoZoomDuringPlay', value)}
            theme={theme}
          />
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 500,
                marginBottom: '0.5rem',
                color: colors.textPrimary,
              }}
            >
              Update Frequency: {settings.timelineUpdateInterval}ms
              <span
                style={{
                  fontSize: '0.75rem',
                  color: colors.textMuted,
                  marginLeft: '0.5rem',
                }}
              >
                ({Math.round(1000 / settings.timelineUpdateInterval)} updates/sec)
              </span>
            </label>
            <input
              type="range"
              min={50}
              max={500}
              step={50}
              value={settings.timelineUpdateInterval}
              onChange={(e) => onSettingChange('timelineUpdateInterval', parseInt(e.target.value))}
              style={{
                width: '100%',
                height: '6px',
                borderRadius: '3px',
                background: colors.surface,
                outline: 'none',
              }}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.7rem',
                color: colors.textMuted,
                marginTop: '0.25rem',
              }}
            >
              <span>Frequent/High CPU (50ms)</span>
              <span>Infrequent/Low CPU (500ms)</span>
            </div>
          </div>
        </SettingsSection>
      </div>
    </div>
  );
}
