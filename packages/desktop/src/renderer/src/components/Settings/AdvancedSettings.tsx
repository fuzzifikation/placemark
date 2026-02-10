/**
 * AdvancedSettings - Developer and fine-tuning options
 */

import { useState } from 'react';
import { type Theme } from '../../theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SettingsSection } from './SettingsSection';
import { SettingsSlider } from './SettingsSlider';
import type { AppSettings } from '../Settings';

interface AdvancedSettingsProps {
  theme: Theme;
  settings: AppSettings;
  onSettingChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  onReset: () => void;
}

export function AdvancedSettings({
  theme,
  settings,
  onSettingChange,
  onReset,
}: AdvancedSettingsProps) {
  const colors = useThemeColors(theme);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    ui: false,
    spider: false,
    tiles: false,
    glass: false,
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
            🔧 Advanced Settings
          </h3>
          <p style={{ margin: 0, color: colors.textSecondary, fontSize: '0.875rem' }}>
            Fine-tune advanced map and interaction settings
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
          title="Reset advanced settings"
        >
          Reset
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div
          style={{
            padding: '1rem',
            backgroundColor: colors.surface,
            borderRadius: '8px',
            border: `1px solid ${colors.warning || colors.border}`,
          }}
        >
          <div
            style={{
              fontSize: '0.875rem',
              fontWeight: 500,
              color: colors.textPrimary,
              marginBottom: '0.5rem',
            }}
          >
            ⚠️ Advanced Settings
          </div>
          <div style={{ fontSize: '0.75rem', color: colors.textMuted }}>
            These settings are for development and testing. Incorrect values may cause issues or
            poor performance.
          </div>
        </div>

        <SettingsSection
          title="UI Settings"
          expanded={expandedSections.ui}
          onToggle={() => toggleSection('ui')}
          theme={theme}
        >
          <SettingsSlider
            label="Toast Duration"
            value={settings.toastDuration}
            min={1000}
            max={10000}
            step={500}
            unit="ms"
            minLabel="Quick (1s)"
            maxLabel="Long (10s)"
            onChange={(val) => onSettingChange('toastDuration', val)}
            theme={theme}
          />
        </SettingsSection>

        <SettingsSection
          title="Spider Settings"
          expanded={expandedSections.spider}
          onToggle={() => toggleSection('spider')}
          theme={theme}
        >
          <SettingsSlider
            label="Spider Trigger Zoom"
            value={settings.spiderTriggerZoom}
            min={0}
            max={18}
            step={1}
            minLabel="Always (0)"
            maxLabel="Max zoom (18)"
            onChange={(val) => onSettingChange('spiderTriggerZoom', val)}
            theme={theme}
          />
          <SettingsSlider
            label="Spider Overlap Tolerance"
            value={settings.spiderOverlapTolerance}
            min={5}
            max={50}
            step={5}
            unit="px"
            minLabel="Tight (5px)"
            maxLabel="Loose (50px)"
            onChange={(val) => onSettingChange('spiderOverlapTolerance', val)}
            theme={theme}
          />
          <SettingsSlider
            label="Spider Radius"
            value={settings.spiderRadius}
            min={30}
            max={150}
            step={10}
            unit="px"
            minLabel="Small (30px)"
            maxLabel="Large (150px)"
            onChange={(val) => onSettingChange('spiderRadius', val)}
            theme={theme}
          />
          <SettingsSlider
            label="Spider Animation Duration"
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
            label="Spider Collapse Margin"
            value={settings.spiderCollapseMargin}
            min={10}
            max={100}
            step={10}
            unit="px"
            minLabel="Tight (10px)"
            maxLabel="Loose (100px)"
            onChange={(val) => onSettingChange('spiderCollapseMargin', val)}
            theme={theme}
          />
          <SettingsSlider
            label="Spider Clear Zoom"
            value={settings.spiderClearZoom}
            min={5}
            max={18}
            step={1}
            minLabel="Zoomed out (5)"
            maxLabel="Zoomed in (18)"
            onChange={(val) => onSettingChange('spiderClearZoom', val)}
            theme={theme}
          />
        </SettingsSection>

        <SettingsSection
          title="Tile Settings"
          expanded={expandedSections.tiles}
          onToggle={() => toggleSection('tiles')}
          theme={theme}
        >
          <div>
            <SettingsSlider
              label="Manual Zoom Limit (Tile Max Zoom)"
              value={settings.tileMaxZoom}
              min={15}
              max={19}
              step={1}
              minLabel="Conservative (15)"
              maxLabel="Maximum (19)"
              onChange={(val) => onSettingChange('tileMaxZoom', val)}
              theme={theme}
            />
            <p
              style={{
                fontSize: '0.7rem',
                color: colors.textMuted,
                margin: '0.25rem 0 0 0',
                fontStyle: 'italic',
              }}
            >
              Maximum zoom level for map tiles. Limits how far you can manually zoom with
              mouse/trackpad. Also limits auto-fit zoom. OSM tiles go to 19, but 18 is safer to
              avoid missing tiles.
            </p>
          </div>
        </SettingsSection>

        <SettingsSection
          title="Glassmorphism Effects"
          expanded={expandedSections.glass}
          onToggle={() => toggleSection('glass')}
          theme={theme}
        >
          <SettingsSlider
            label="Glass Blur"
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
            label="Glass Surface Opacity"
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
