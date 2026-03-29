/**
 * ExportSheet - Floating panel for exporting photo data (CSV / GeoJSON / GPX)
 *
 * Appears as a glass-style popover below the FloatingHeader toolbar.
 * Selection trumps view: if any photos are selected, exports those; otherwise exports the map view.
 */

import { useState } from 'react';
import { Download } from 'lucide-react';
import type { Theme } from '../theme';
import { useThemeColors } from '../hooks/useThemeColors';
import {
  SPACING,
  BORDER_RADIUS,
  FONT_SIZE,
  FONT_WEIGHT,
  FONT_FAMILY,
  LAYOUT,
  getGlassStyle,
} from '../constants/ui';
import type { ExportFormat } from '../types/preload';

interface ExportSheetProps {
  photoIds: number[];
  scopeLabel: string; // e.g. "47 selected photos" or "152 photos in view"
  onClose: () => void;
  theme: Theme;
  glassBlur: number;
  glassSurfaceOpacity: number;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const FORMAT_OPTIONS: { value: ExportFormat; label: string; description: string; ext: string }[] = [
  {
    value: 'geojson',
    label: 'GeoJSON',
    description: 'Standard geographic data format, compatible with most GIS tools',
    ext: 'geojson',
  },
  {
    value: 'csv',
    label: 'CSV',
    description: 'Spreadsheet-compatible table with coordinates and metadata',
    ext: 'csv',
  },
  {
    value: 'gpx',
    label: 'GPX',
    description: 'GPS Exchange Format, compatible with navigation apps and devices',
    ext: 'gpx',
  },
];

export function ExportSheet({
  photoIds,
  scopeLabel,
  onClose,
  theme,
  glassBlur,
  glassSurfaceOpacity,
  onSuccess,
  onError,
}: ExportSheetProps) {
  const colors = useThemeColors(theme);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('geojson');
  const [exporting, setExporting] = useState(false);

  const hasPhotos = photoIds.length > 0;

  const handleExport = async () => {
    if (!hasPhotos || exporting) return;

    setExporting(true);
    try {
      const result = await window.api.export.saveFile(photoIds, selectedFormat);
      if (result.saved && result.filePath) {
        const filename = result.filePath.split(/[\\/]/).pop() ?? result.filePath;
        onSuccess(`${result.count} photo${result.count !== 1 ? 's' : ''} exported → ${filename}`);
        onClose();
      }
      // If !result.saved the user cancelled the save dialog — do nothing
    } catch (err) {
      onError(`Export failed: ${err}`);
    } finally {
      setExporting(false);
    }
  };

  const containerStyle: React.CSSProperties = {
    ...getGlassStyle(colors, glassBlur, glassSurfaceOpacity),
    borderRadius: BORDER_RADIUS.XL,
    padding: SPACING.LG,
    width: '280px',
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.MD,
    fontFamily: FONT_FAMILY,
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.XS,
  };

  const titleStyle: React.CSSProperties = {
    margin: 0,
    fontSize: FONT_SIZE.MD,
    fontWeight: FONT_WEIGHT.MEDIUM,
    color: colors.textPrimary,
  };

  const subtitleStyle: React.CSSProperties = {
    margin: 0,
    fontSize: FONT_SIZE.XS,
    color: colors.textSecondary,
  };

  const radioGroupStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.SM,
  };

  return (
    // Backdrop to close the sheet when clicking outside
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 500,
      }}
      onClick={onClose}
    >
      {/* Sheet card — anchored below the header toolbar, near the Tools section */}
      <div
        style={{
          ...containerStyle,
          position: 'absolute',
          top: `calc(${LAYOUT.PANEL_INSET} + ${LAYOUT.HEADER_HEIGHT} + ${LAYOUT.PANEL_GAP})`,
          left: LAYOUT.PANEL_INSET,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={headerStyle}>
          <h3 style={titleStyle}>Export</h3>
          <p style={subtitleStyle}>{scopeLabel}</p>
        </div>

        {/* Empty state */}
        {!hasPhotos && (
          <p
            style={{
              margin: 0,
              fontSize: FONT_SIZE.SM,
              color: colors.textMuted,
              fontStyle: 'italic',
            }}
          >
            No photos with GPS data in the current view.
          </p>
        )}

        {/* Format selector */}
        {hasPhotos && (
          <div style={radioGroupStyle}>
            {FORMAT_OPTIONS.map((opt) => {
              const isSelected = selectedFormat === opt.value;
              return (
                <label
                  key={opt.value}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: SPACING.SM,
                    padding: `${SPACING.SM} ${SPACING.MD}`,
                    borderRadius: BORDER_RADIUS.MD,
                    border: `1px solid ${isSelected ? colors.primary : colors.border}`,
                    backgroundColor: isSelected ? `${colors.primary}18` : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <input
                    type="radio"
                    name="export-format"
                    value={opt.value}
                    checked={isSelected}
                    onChange={() => setSelectedFormat(opt.value)}
                    style={{ marginTop: '2px', accentColor: colors.primary, flexShrink: 0 }}
                  />
                  <div>
                    <div
                      style={{
                        fontSize: FONT_SIZE.SM,
                        fontWeight: isSelected ? FONT_WEIGHT.BOLD : FONT_WEIGHT.NORMAL,
                        color: colors.textPrimary,
                        fontFamily: FONT_FAMILY,
                      }}
                    >
                      {opt.label}
                    </div>
                    <div
                      style={{
                        fontSize: FONT_SIZE.XS,
                        color: colors.textSecondary,
                        marginTop: '2px',
                        fontFamily: FONT_FAMILY,
                      }}
                    >
                      {opt.description}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        )}

        {/* Export button */}
        <button
          onClick={handleExport}
          disabled={!hasPhotos || exporting}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: SPACING.SM,
            padding: `${SPACING.SM} ${SPACING.MD}`,
            backgroundColor: hasPhotos && !exporting ? colors.primary : colors.surfaceHover,
            color: hasPhotos && !exporting ? colors.buttonText : colors.textMuted,
            border: 'none',
            borderRadius: BORDER_RADIUS.LG,
            cursor: hasPhotos && !exporting ? 'pointer' : 'not-allowed',
            fontSize: FONT_SIZE.SM,
            fontWeight: FONT_WEIGHT.MEDIUM,
            fontFamily: FONT_FAMILY,
            transition: 'all 0.15s ease',
            opacity: !hasPhotos || exporting ? 0.6 : 1,
          }}
        >
          <Download size={15} />
          {exporting ? 'Exporting…' : 'Export'}
        </button>
      </div>
    </div>
  );
}
