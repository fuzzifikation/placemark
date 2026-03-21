/**
 * PlacemarksSettings - placemark labeling and timeline playback configuration
 */

import { type Theme } from '../../theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SettingsToggle } from './SettingsToggle';
import { SettingsSlider } from './SettingsSlider';
import type { AppSettings } from '../Settings';

interface PlacemarksSettingsProps {
  theme: Theme;
  settings: AppSettings;
  onSettingChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  onReset: () => void;
}

export function PlacemarksSettings({
  theme,
  settings,
  onSettingChange,
  onReset,
}: PlacemarksSettingsProps) {
  const colors = useThemeColors(theme);

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem', fontWeight: 600 }}>
          Placemarks
        </h3>
        <p style={{ margin: 0, color: colors.textSecondary, fontSize: '0.875rem' }}>
          Configure placemark labeling and timeline playback behavior
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div
          style={{
            backgroundColor: colors.surface,
            padding: '1rem 1rem 0 1rem',
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
          }}
        >
          <SettingsToggle
            label="Location lookup for placemarks"
            value={settings.reverseGeocodeEnabled}
            description="When enabled, the center coordinate of a saved placemark area is sent to OpenStreetMap Nominatim to display a human-readable place name. No photo data is sent."
            onChange={(val) => onSettingChange('reverseGeocodeEnabled', val)}
            theme={theme}
          />
        </div>

        <div
          style={{
            backgroundColor: colors.surface,
            padding: '1rem 1rem 0 1rem',
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
          }}
        >
          <SettingsToggle
            label="Auto-zoom during timeline changes"
            value={settings.autoZoomDuringPlay}
            description="Automatically fit the map to photos when timeline playback runs or timeline range is adjusted."
            onChange={(val) => onSettingChange('autoZoomDuringPlay', val)}
            theme={theme}
          />
        </div>

        <div
          style={{
            backgroundColor: colors.surface,
            padding: '1rem',
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
          }}
        >
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: colors.textMuted,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '-0.25rem',
            }}
          >
            Timeline Playback
          </div>

          <SettingsSlider
            label="Map update frequency"
            value={settings.timelineUpdateInterval}
            min={50}
            max={500}
            step={50}
            unit="ms"
            minLabel="Fast / High CPU (50ms)"
            maxLabel="Slow / Low CPU (500ms)"
            description="How quickly the map updates during timeline playback"
            onChange={(val) => onSettingChange('timelineUpdateInterval', val)}
            theme={theme}
          />
          <SettingsSlider
            label="▶ Slow speed (days/sec)"
            value={settings.playSpeedSlowDays}
            min={1}
            max={14}
            step={1}
            unit=" days"
            minLabel="1 day"
            maxLabel="14 days"
            description="Timeline days advanced per second during slow playback"
            onChange={(val) => onSettingChange('playSpeedSlowDays', val)}
            theme={theme}
          />
          <SettingsSlider
            label="▶▶ Medium speed (days/sec)"
            value={settings.playSpeedMediumDays}
            min={7}
            max={60}
            step={7}
            unit=" days"
            minLabel="7 days"
            maxLabel="60 days"
            description="Timeline days advanced per second during medium playback"
            onChange={(val) => onSettingChange('playSpeedMediumDays', val)}
            theme={theme}
          />
          <SettingsSlider
            label="▶▶▶ Fast speed (days/sec)"
            value={settings.playSpeedFastDays}
            min={30}
            max={365}
            step={15}
            unit=" days"
            minLabel="30 days"
            maxLabel="365 days"
            description="Timeline days advanced per second during fast playback"
            onChange={(val) => onSettingChange('playSpeedFastDays', val)}
            theme={theme}
          />
        </div>
      </div>

      <div
        style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: `1px solid ${colors.border}` }}
      >
        <button
          onClick={onReset}
          title="Reset placemarks settings to defaults"
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            fontSize: '0.75rem',
            color: colors.textMuted,
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          Reset to defaults
        </button>
      </div>
    </div>
  );
}
