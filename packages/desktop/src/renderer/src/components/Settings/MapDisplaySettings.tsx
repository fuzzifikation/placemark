/**
 * MapDisplaySettings - Map clustering and display configuration
 */

import { type Theme } from '../../theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SettingsSection } from './SettingsSection';
import { SettingsToggle } from './SettingsToggle';
import { SettingsSlider } from './SettingsSlider';
import type { AppSettings } from '../Settings';

interface MapDisplaySettingsProps {
  theme: Theme;
  settings: AppSettings;
  onSettingChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  onReset: () => void;
}

export function MapDisplaySettings({
  theme,
  settings,
  onSettingChange,
  onReset,
}: MapDisplaySettingsProps) {
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
            🗺️ Map & Display
          </h3>
          <p style={{ margin: 0, color: colors.textSecondary, fontSize: '0.875rem' }}>
            Configure how photos are displayed on the map
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
          title="Reset map settings"
        >
          Reset
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Clustering */}
        <SettingsSection
          title="Marker Clustering"
          expanded={true}
          onToggle={() => {}}
          theme={theme}
        >
          <SettingsToggle
            label="Enable marker clustering"
            value={settings.clusteringEnabled}
            description="Group nearby photos into clusters to improve performance with many photos"
            onChange={(val) => onSettingChange('clusteringEnabled', val)}
            theme={theme}
          />
          {settings.clusteringEnabled && (
            <>
              <SettingsSlider
                label="Cluster Radius"
                value={settings.clusterRadius}
                min={10}
                max={100}
                step={5}
                unit="px"
                minLabel="More markers (10px)"
                maxLabel="Fewer markers (100px)"
                onChange={(val) => onSettingChange('clusterRadius', val)}
                theme={theme}
              />
              <SettingsSlider
                label="Stop Clustering At Zoom"
                value={settings.clusterMaxZoom}
                min={10}
                max={20}
                step={1}
                minLabel="Earlier (10)"
                maxLabel="Later (20)"
                onChange={(val) => onSettingChange('clusterMaxZoom', val)}
                theme={theme}
              />
            </>
          )}
        </SettingsSection>

        {/* Display Options */}
        <SettingsSection title="Display Options" expanded={true} onToggle={() => {}} theme={theme}>
          <SettingsToggle
            label="Show Heatmap"
            value={settings.showHeatmap}
            description="Display photo density as a colored heat map overlay"
            onChange={(val) => onSettingChange('showHeatmap', val)}
            theme={theme}
          />
          <SettingsSlider
            label="Maximum Zoom Level"
            value={settings.mapMaxZoom}
            min={10}
            max={settings.tileMaxZoom}
            step={1}
            minLabel="Zoomed out (10)"
            maxLabel={`Zoomed in (${settings.tileMaxZoom})`}
            onChange={(val) => onSettingChange('mapMaxZoom', val)}
            theme={theme}
          />
          <SettingsSlider
            label="Map Padding"
            value={settings.mapPadding}
            min={20}
            max={100}
            step={10}
            unit="px"
            minLabel="Tight (20px)"
            maxLabel="Loose (100px)"
            onChange={(val) => onSettingChange('mapPadding', val)}
            theme={theme}
          />
          <SettingsSlider
            label="Transition Speed"
            value={settings.mapTransitionDuration}
            min={0}
            max={1000}
            step={50}
            unit="ms"
            minLabel="Instant (0ms)"
            maxLabel="Slow (1000ms)"
            onChange={(val) => onSettingChange('mapTransitionDuration', val)}
            theme={theme}
          />
        </SettingsSection>
      </div>
    </div>
  );
}
