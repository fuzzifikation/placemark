/**
 * MapDisplaySettings - Map clustering and display configuration
 */

import { useState } from 'react';
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
            Map & Display
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Inline toggles */}
        <div
          style={{
            backgroundColor: colors.surface,
            padding: '1rem 1rem 0 1rem',
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
          }}
        >
          <SettingsToggle
            label="Enable marker clustering"
            value={settings.clusteringEnabled}
            description="Group nearby photos into clusters to improve performance with many photos"
            onChange={(val) => onSettingChange('clusteringEnabled', val)}
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
            label="Show Heatmap"
            value={settings.showHeatmap}
            description="Display photo density as a colored heat map overlay"
            onChange={(val) => onSettingChange('showHeatmap', val)}
            theme={theme}
          />
        </div>

        {/* Advanced (collapsed) */}
        <SettingsSection
          title="Advanced"
          expanded={expandedSections.advanced}
          onToggle={() => toggleSection('advanced')}
          theme={theme}
          isAdvanced
        >
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
                label="Uncluster at zoom level"
                value={settings.clusterMaxZoom}
                min={10}
                max={20}
                step={1}
                minLabel="Earlier (10)"
                maxLabel="Later (20)"
                description="The map stops grouping photos into clusters above this zoom level"
                onChange={(val) => onSettingChange('clusterMaxZoom', val)}
                theme={theme}
              />
              <SettingsSlider
                label="Cluster Opacity"
                value={Math.round(settings.clusterOpacity * 100)}
                min={10}
                max={100}
                step={5}
                unit="%"
                minLabel="Very Transparent (10%)"
                maxLabel="Opaque (100%)"
                onChange={(val) => onSettingChange('clusterOpacity', val / 100)}
                theme={theme}
              />
              <SettingsSlider
                label="Marker Opacity"
                value={Math.round(settings.unclusteredPointOpacity * 100)}
                min={10}
                max={100}
                step={5}
                unit="%"
                minLabel="Very Transparent (10%)"
                maxLabel="Opaque (100%)"
                onChange={(val) => onSettingChange('unclusteredPointOpacity', val / 100)}
                theme={theme}
              />
            </>
          )}
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
          <SettingsSlider
            label="Playback Animation Speed"
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
            label="Maximum zoom level"
            value={settings.tileMaxZoom}
            min={15}
            max={19}
            step={1}
            minLabel="Conservative (15)"
            maxLabel="Maximum (19)"
            description="How far you can zoom in with the mouse or trackpad. OSM tiles work up to 19, but 18 is safer to avoid missing tiles."
            onChange={(val) => onSettingChange('tileMaxZoom', val)}
            theme={theme}
          />
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: colors.textMuted,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              paddingTop: '0.75rem',
              borderTop: `1px solid ${colors.border}`,
              marginTop: '0.25rem',
              marginBottom: '-0.25rem',
            }}
          >
            Overlapping Markers
          </div>
          <SettingsSlider
            label="Trigger zoom level"
            value={settings.spiderTriggerZoom}
            min={0}
            max={18}
            step={1}
            minLabel="Always (0)"
            maxLabel="Max zoom (18)"
            description="Zoom level at which overlapping markers spread out instead of zooming in"
            onChange={(val) => onSettingChange('spiderTriggerZoom', val)}
            theme={theme}
          />
          <SettingsSlider
            label="Overlap tolerance"
            value={settings.spiderOverlapTolerance}
            min={5}
            max={50}
            step={5}
            unit="px"
            minLabel="Tight (5px)"
            maxLabel="Loose (50px)"
            description="How close markers must be (in pixels) before they are considered overlapping"
            onChange={(val) => onSettingChange('spiderOverlapTolerance', val)}
            theme={theme}
          />
          <SettingsSlider
            label="Spread radius"
            value={settings.spiderRadius}
            min={30}
            max={150}
            step={10}
            unit="px"
            minLabel="Small (30px)"
            maxLabel="Large (150px)"
            description="How far markers spread out when expanded"
            onChange={(val) => onSettingChange('spiderRadius', val)}
            theme={theme}
          />
          <SettingsSlider
            label="Animation duration"
            value={settings.spiderAnimationDuration}
            min={0}
            max={1000}
            step={50}
            unit="ms"
            minLabel="Instant (0ms)"
            maxLabel="Slow (1000ms)"
            onChange={(val) => onSettingChange('spiderAnimationDuration', val)}
            theme={theme}
          />
          <SettingsSlider
            label="Collapse margin"
            value={settings.spiderCollapseMargin}
            min={10}
            max={100}
            step={10}
            unit="px"
            minLabel="Tight (10px)"
            maxLabel="Loose (100px)"
            description="How far the cursor can stray from the spread markers before they collapse"
            onChange={(val) => onSettingChange('spiderCollapseMargin', val)}
            theme={theme}
          />
          <SettingsSlider
            label="Return zoom level"
            value={settings.spiderClearZoom}
            min={5}
            max={18}
            step={1}
            minLabel="Zoomed out (5)"
            maxLabel="Zoomed in (18)"
            description="Spread markers automatically collapse when zooming below this level"
            onChange={(val) => onSettingChange('spiderClearZoom', val)}
            theme={theme}
          />
        </SettingsSection>
      </div>
    </div>
  );
}
