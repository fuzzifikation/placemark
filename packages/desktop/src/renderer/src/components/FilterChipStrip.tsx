/**
 * FilterChipStrip — displays active format/camera filter chips below the
 * floating header. Each chip can be removed individually; a "Clear all" button
 * appears when multiple chips are active.
 */

import { useMemo, useCallback } from 'react';
import type { ThemeColors } from '../theme';
import { formatMimeLabel } from '../utils/formatLocale';
import { LAYOUT, SPACING, BORDER_RADIUS, FONT_SIZE, FONT_FAMILY, Z_INDEX } from '../constants/ui';

export interface FilterChip {
  key: string;
  label: string;
  type: 'mimeType' | 'camera';
}

interface FilterChipStripProps {
  activeFilters: { mimeTypes: Set<string>; cameras: Set<string> };
  showStats: boolean;
  colors: ThemeColors;
  glassBlur: number;
  onToggleMimeType: (mimeType: string) => void;
  onToggleCamera: (camera: string) => void;
  onClearAll: () => void;
}

export function FilterChipStrip({
  activeFilters,
  showStats,
  colors,
  glassBlur,
  onToggleMimeType,
  onToggleCamera,
  onClearAll,
}: FilterChipStripProps) {
  const chips = useMemo<FilterChip[]>(() => {
    const result: FilterChip[] = [];
    for (const mimeType of activeFilters.mimeTypes) {
      result.push({ key: mimeType, label: formatMimeLabel(mimeType), type: 'mimeType' });
    }
    for (const cameraKey of activeFilters.cameras) {
      const [make, model] = cameraKey.split('|');
      const label = make === model || make === 'Unknown' ? model : `${make} ${model}`;
      result.push({ key: cameraKey, label, type: 'camera' });
    }
    return result;
  }, [activeFilters]);

  const handleRemove = useCallback(
    (chip: FilterChip) => {
      if (chip.type === 'mimeType') {
        onToggleMimeType(chip.key);
      } else {
        onToggleCamera(chip.key);
      }
    },
    [onToggleMimeType, onToggleCamera]
  );

  if (chips.length === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: `calc(${LAYOUT.PANEL_INSET} + ${LAYOUT.HEADER_HEIGHT} + ${LAYOUT.PANEL_GAP})`,
        left: LAYOUT.PANEL_INSET,
        right: showStats
          ? `calc(${LAYOUT.PANEL_INSET} + ${LAYOUT.STATS_PANEL_WIDTH} + ${LAYOUT.PANEL_GAP})`
          : LAYOUT.PANEL_INSET,
        zIndex: Z_INDEX.HEADER,
        display: 'flex',
        flexWrap: 'wrap',
        gap: SPACING.XS,
        alignItems: 'center',
      }}
    >
      {chips.map((chip) => (
        <div
          key={`${chip.type}:${chip.key}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: `3px ${SPACING.SM} 3px ${SPACING.SM}`,
            borderRadius: BORDER_RADIUS.LG,
            backgroundColor: `${colors.primary}22`,
            border: `1px solid ${colors.primary}66`,
            fontSize: FONT_SIZE.XS,
            fontWeight: 600,
            color: colors.primary,
            whiteSpace: 'nowrap',
            fontFamily: FONT_FAMILY,
            backdropFilter: `blur(${glassBlur}px)`,
            WebkitBackdropFilter: `blur(${glassBlur}px)`,
          }}
        >
          {chip.label}
          <button
            onClick={() => handleRemove(chip)}
            title={`Remove filter: ${chip.label}`}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: colors.primary,
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              lineHeight: 1,
              fontSize: '14px',
            }}
          >
            ×
          </button>
        </div>
      ))}
      {chips.length > 1 && (
        <button
          onClick={onClearAll}
          title="Clear all filters"
          style={{
            background: 'none',
            border: `1px solid ${colors.border}`,
            cursor: 'pointer',
            color: colors.textMuted,
            padding: `3px ${SPACING.SM}`,
            borderRadius: BORDER_RADIUS.LG,
            fontSize: FONT_SIZE.XS,
            fontFamily: FONT_FAMILY,
            whiteSpace: 'nowrap',
            backdropFilter: `blur(${glassBlur}px)`,
            WebkitBackdropFilter: `blur(${glassBlur}px)`,
          }}
        >
          Clear all
        </button>
      )}
    </div>
  );
}
