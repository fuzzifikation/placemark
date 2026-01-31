/**
 * FloatingHeader - top navigation bar with controls
 */

import type { SelectionMode } from './MapView';
import { SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, Z_INDEX } from '../constants/ui';
import { Lasso, Folder, Settings, History } from 'lucide-react';

interface FloatingHeaderProps {
  photoCount: number;
  selectionCount: number;
  selectionMode: SelectionMode;
  dateRangeAvailable: boolean;
  showTimeline: boolean;
  scanning: boolean;
  colors: any;
  onSelectionModeToggle: () => void;
  onOperationsOpen: () => void;
  onSettingsOpen: () => void;
  onTimelineToggle: () => void;
  onScanFolder: () => void;
}

export function FloatingHeader({
  photoCount,
  selectionCount,
  selectionMode,
  dateRangeAvailable,
  showTimeline,
  scanning,
  colors,
  onSelectionModeToggle,
  onOperationsOpen,
  onSettingsOpen,
  onTimelineToggle,
  onScanFolder,
}: FloatingHeaderProps) {
  return (
    <div
      style={{
        position: 'absolute',
        top: SPACING.LG,
        left: SPACING.LG,
        padding: `${SPACING.MD} ${SPACING.XL}`,
        backgroundColor: colors.glassSurface,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: `1px solid ${colors.glassBorder}`,
        borderRadius: BORDER_RADIUS.XL,
        boxShadow: colors.shadow,
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.XXL,
        zIndex: Z_INDEX.HEADER,
        transition: 'background-color 0.2s ease, border-color 0.2s ease',
      }}
    >
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.SM }}>
        <img
          src="/icon.png"
          alt="Placemark"
          style={{
            width: 32,
            height: 32,
            borderRadius: '4px',
            flexShrink: 0,
          }}
        />
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: FONT_SIZE.LG,
              fontWeight: FONT_WEIGHT.BOLD,
              color: colors.textPrimary,
              letterSpacing: '-0.025em',
              fontFamily: 'sans-serif',
            }}
          >
            Placemark
          </h1>
          <p
            style={{
              margin: 0,
              color: colors.textSecondary,
              fontSize: FONT_SIZE.XS,
              fontWeight: FONT_WEIGHT.NORMAL,
              fontFamily: 'sans-serif',
            }}
          >
            {photoCount} photos found
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: SPACING.MD }}>
        {/* Selection Mode Button */}
        <button
          title={
            selectionMode === 'lasso'
              ? 'Exit Selection Mode'
              : 'Enter Selection Mode (Shift+Drag to add, Alt+Drag to remove)'
          }
          onClick={onSelectionModeToggle}
          style={{
            padding: `${SPACING.SM} ${SPACING.LG}`,
            fontSize: FONT_SIZE.SM,
            fontWeight: FONT_WEIGHT.MEDIUM,
            backgroundColor: selectionMode === 'lasso' ? colors.primary : 'transparent',
            color: selectionMode === 'lasso' ? colors.buttonText : colors.textPrimary,
            border: selectionMode === 'lasso' ? 'none' : `1px solid ${colors.border}`,
            borderRadius: BORDER_RADIUS.LG,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: SPACING.SM,
            boxShadow: selectionMode === 'lasso' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
          }}
          onMouseEnter={(e) => {
            if (selectionMode !== 'lasso') {
              e.currentTarget.style.backgroundColor = colors.surfaceHover;
            }
          }}
          onMouseLeave={(e) => {
            if (selectionMode !== 'lasso') {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          <Lasso size={16} />
          Select
        </button>

        {/* Operations Button */}
        <button
          onClick={onOperationsOpen}
          disabled={photoCount === 0}
          style={{
            padding: `${SPACING.SM} ${SPACING.LG}`,
            fontSize: FONT_SIZE.SM,
            fontWeight: FONT_WEIGHT.MEDIUM,
            backgroundColor: 'transparent',
            color: colors.textPrimary,
            border: `1px solid ${colors.border}`,
            borderRadius: BORDER_RADIUS.LG,
            cursor: photoCount > 0 ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: SPACING.SM,
          }}
        >
          <Folder size={16} />
          Organize ({selectionCount > 0 ? selectionCount : 0})
        </button>

        {/* Settings Button */}
        <button
          onClick={onSettingsOpen}
          style={{
            padding: SPACING.SM,
            fontSize: FONT_SIZE.LG,
            backgroundColor: 'transparent',
            color: colors.textPrimary,
            border: 'none',
            borderRadius: BORDER_RADIUS.FULL,
            cursor: 'pointer',
            transition: 'background-color 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.surfaceHover)}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          title="Settings"
        >
          <Settings size={20} />
        </button>

        {/* Timeline Button */}
        <button
          onClick={onTimelineToggle}
          disabled={!dateRangeAvailable || selectionMode === 'lasso'}
          style={{
            padding: SPACING.SM,
            fontSize: FONT_SIZE.LG,
            backgroundColor: showTimeline ? colors.primary : 'transparent',
            color: showTimeline ? colors.buttonText : colors.textPrimary,
            opacity: selectionMode === 'lasso' ? 0.3 : 1,
            border: 'none',
            borderRadius: BORDER_RADIUS.FULL,
            cursor: dateRangeAvailable && selectionMode !== 'lasso' ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
          }}
          onMouseEnter={(e) => {
            if (dateRangeAvailable && !showTimeline) {
              e.currentTarget.style.backgroundColor = colors.surfaceHover;
            }
          }}
          onMouseLeave={(e) => {
            if (!showTimeline) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
          title="Toggle Timeline"
        >
          <History size={20} />
        </button>

        {/* Scan Button */}
        <button
          onClick={onScanFolder}
          disabled={scanning}
          style={{
            padding: `${SPACING.SM} ${SPACING.XL}`,
            fontSize: FONT_SIZE.SM,
            fontWeight: FONT_WEIGHT.MEDIUM,
            backgroundColor: colors.primary,
            color: colors.buttonText,
            border: 'none',
            borderRadius: BORDER_RADIUS.LG,
            cursor: scanning ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
          }}
          onMouseEnter={(e) => {
            if (!scanning) e.currentTarget.style.backgroundColor = colors.primaryHover;
          }}
          onMouseLeave={(e) => {
            if (!scanning) e.currentTarget.style.backgroundColor = colors.primary;
          }}
        >
          {scanning ? 'Scanning...' : 'Scan'}
        </button>
      </div>
    </div>
  );
}
