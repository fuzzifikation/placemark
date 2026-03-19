/**
 * MapDisplaySettings - Map clustering and display configuration
 */

import { useState } from 'react';
import { type Theme } from '../../theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SettingsSection } from './SettingsSection';
import { SettingsToggle } from './SettingsToggle';
import { SettingsSlider } from './SettingsSlider';
import { SettingsNumberInput } from './SettingsNumberInput';
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
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem', fontWeight: 600 }}>
          Map & Display
        </h3>
        <p style={{ margin: 0, color: colors.textSecondary, fontSize: '0.875rem' }}>
          Configure how photos are displayed on the map
        </p>
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
          {/* Clustering */}
          {settings.clusteringEnabled && (
            <>
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
                Clustering
              </div>
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

          {/* Map */}
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: colors.textMuted,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              paddingTop: settings.clusteringEnabled ? '0.75rem' : undefined,
              borderTop: settings.clusteringEnabled ? `1px solid ${colors.border}` : undefined,
              marginTop: settings.clusteringEnabled ? '0.25rem' : undefined,
              marginBottom: '-0.25rem',
            }}
          >
            Map
          </div>
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

          {/* Overlapping Markers */}
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

          {/* Timeline Playback */}
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

          {/* Developer settings gate */}
          <div
            style={{
              paddingTop: '0.75rem',
              borderTop: `1px solid ${colors.border}`,
              marginTop: '0.25rem',
            }}
          >
            <SettingsToggle
              label="Developer settings"
              value={settings.devSettingsEnabled}
              description="Show low-level tuning options — not needed for normal use"
              onChange={(val) => onSettingChange('devSettingsEnabled', val)}
              theme={theme}
            />
          </div>

          {settings.devSettingsEnabled && (
            <div
              style={{
                marginTop: '0.75rem',
                padding: '0.75rem',
                backgroundColor: colors.surface,
                borderRadius: '6px',
                border: `1px solid ${colors.border}`,
              }}
            >
              <SettingsNumberInput
                label="Map padding"
                value={settings.mapPadding}
                min={20}
                max={100}
                step={1}
                unit="px"
                onChange={(val) => onSettingChange('mapPadding', val)}
                theme={theme}
              />
              <SettingsNumberInput
                label="Max zoom level"
                value={settings.tileMaxZoom}
                min={15}
                max={19}
                step={1}
                description="OSM tiles are reliable up to 18"
                onChange={(val) => onSettingChange('tileMaxZoom', val)}
                theme={theme}
              />
              <SettingsNumberInput
                label="Spider trigger zoom"
                value={settings.spiderTriggerZoom}
                min={0}
                max={18}
                step={1}
                description="Zoom at which overlapping markers spread instead of zoom"
                onChange={(val) => onSettingChange('spiderTriggerZoom', val)}
                theme={theme}
              />
              <SettingsNumberInput
                label="Overlap tolerance"
                value={settings.spiderOverlapTolerance}
                min={5}
                max={50}
                step={1}
                unit="px"
                description="Pixel distance at which markers are considered overlapping"
                onChange={(val) => onSettingChange('spiderOverlapTolerance', val)}
                theme={theme}
              />
              <SettingsNumberInput
                label="Collapse margin"
                value={settings.spiderCollapseMargin}
                min={10}
                max={100}
                step={1}
                unit="px"
                description="Cursor distance outside spider before it collapses"
                onChange={(val) => onSettingChange('spiderCollapseMargin', val)}
                theme={theme}
              />
              <SettingsNumberInput
                label="Spider clear zoom"
                value={settings.spiderClearZoom}
                min={5}
                max={18}
                step={1}
                description="Spider auto-collapses when zooming below this level"
                onChange={(val) => onSettingChange('spiderClearZoom', val)}
                theme={theme}
              />
            </div>
          )}
        </SettingsSection>
      </div>

      {/* Section footer */}
      <div
        style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: `1px solid ${colors.border}` }}
      >
        <button
          onClick={onReset}
          title="Reset map settings to defaults"
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
