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
    spider: false,
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
            Advanced Settings
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
          title="Overlapping Markers"
          expanded={expandedSections.spider}
          onToggle={() => toggleSection('spider')}
          theme={theme}
        >
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
