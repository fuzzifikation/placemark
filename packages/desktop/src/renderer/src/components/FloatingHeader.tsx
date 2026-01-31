/**
 * FloatingHeader - top navigation bar with controls
 */

import type { SelectionMode } from './MapView';
import {
  SPACING,
  BORDER_RADIUS,
  FONT_SIZE,
  FONT_WEIGHT,
  FONT_FAMILY,
  Z_INDEX,
} from '../constants/ui';
import { Lasso, Folder, Settings, History } from 'lucide-react';
import type { ThemeColors } from '../theme';

interface FloatingHeaderProps {
  photoCount: number;
  selectionCount: number;
  selectionMode: SelectionMode;
  dateRangeAvailable: boolean;
  showTimeline: boolean;
  scanning: boolean;
  colors: ThemeColors;
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
              fontFamily: FONT_FAMILY,
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
              fontFamily: FONT_FAMILY,
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
          className="floating-header-button"
          style={{
            padding: `${SPACING.SM} ${SPACING.LG}`,
            fontSize: FONT_SIZE.SM,
            fontWeight: FONT_WEIGHT.MEDIUM,
            backgroundColor: selectionMode === 'lasso' ? colors.primary : 'transparent',
            color: selectionMode === 'lasso' ? colors.buttonText : colors.textPrimary,
            border: selectionMode === 'lasso' ? 'none' : `1px solid ${colors.border}`,
            borderRadius: BORDER_RADIUS.LG,
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            alignItems: 'center',
            gap: SPACING.SM,
            boxShadow: selectionMode === 'lasso' ? '0 2px 8px rgba(37, 99, 235, 0.3)' : 'none',
            transform: 'scale(1)',
          }}
          onMouseEnter={(e) => {
            if (selectionMode !== 'lasso') {
              e.currentTarget.style.backgroundColor = colors.surfaceHover;
              e.currentTarget.style.transform = 'scale(1.02)';
            }
          }}
          onMouseLeave={(e) => {
            if (selectionMode !== 'lasso') {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.transform = 'scale(1)';
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
          className="floating-header-button"
          style={{
            padding: `${SPACING.SM} ${SPACING.LG}`,
            fontSize: FONT_SIZE.SM,
            fontWeight: FONT_WEIGHT.MEDIUM,
            backgroundColor: 'transparent',
            color: photoCount === 0 ? colors.textMuted : colors.textPrimary,
            border: `1px solid ${colors.border}`,
            borderRadius: BORDER_RADIUS.LG,
            cursor: photoCount > 0 ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            alignItems: 'center',
            gap: SPACING.SM,
            transform: 'scale(1)',
            opacity: photoCount === 0 ? 0.6 : 1,
          }}
          onMouseEnter={(e) => {
            if (photoCount > 0) {
              e.currentTarget.style.backgroundColor = colors.surfaceHover;
              e.currentTarget.style.borderColor = colors.primary;
              e.currentTarget.style.transform = 'scale(1.02)';
            }
          }}
          onMouseLeave={(e) => {
            if (photoCount > 0) {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = colors.border;
              e.currentTarget.style.transform = 'scale(1)';
            }
          }}
        >
          <Folder size={16} />
          Organize ({selectionCount > 0 ? selectionCount : 0})
        </button>

        {/* Settings Button */}
        <button
          onClick={onSettingsOpen}
          className="floating-header-button"
          style={{
            padding: SPACING.SM,
            fontSize: FONT_SIZE.LG,
            backgroundColor: 'transparent',
            color: colors.textPrimary,
            border: 'none',
            borderRadius: BORDER_RADIUS.FULL,
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            transform: 'scale(1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = colors.surfaceHover;
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = 'none';
          }}
          title="Settings"
        >
          <Settings size={20} />
        </button>

        {/* Timeline Button */}
        <button
          onClick={onTimelineToggle}
          disabled={!dateRangeAvailable || selectionMode === 'lasso'}
          className="floating-header-button"
          style={{
            padding: SPACING.SM,
            fontSize: FONT_SIZE.LG,
            backgroundColor: showTimeline ? colors.primary : 'transparent',
            color: showTimeline ? colors.buttonText : colors.textPrimary,
            opacity: selectionMode === 'lasso' ? 0.3 : 1,
            border: 'none',
            borderRadius: BORDER_RADIUS.FULL,
            cursor: dateRangeAvailable && selectionMode !== 'lasso' ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            transform: 'scale(1)',
            boxShadow: showTimeline ? '0 2px 8px rgba(37, 99, 235, 0.3)' : 'none',
          }}
          onMouseEnter={(e) => {
            if (dateRangeAvailable && !showTimeline) {
              e.currentTarget.style.backgroundColor = colors.surfaceHover;
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
            }
          }}
          onMouseLeave={(e) => {
            if (!showTimeline) {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = 'none';
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
          className="floating-header-button"
          style={{
            padding: `${SPACING.SM} ${SPACING.XL}`,
            fontSize: FONT_SIZE.SM,
            fontWeight: FONT_WEIGHT.MEDIUM,
            backgroundColor: colors.primary,
            color: colors.buttonText,
            border: 'none',
            borderRadius: BORDER_RADIUS.LG,
            cursor: scanning ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
            transform: 'scale(1)',
            opacity: scanning ? 0.7 : 1,
          }}
          onMouseEnter={(e) => {
            if (!scanning) {
              e.currentTarget.style.backgroundColor = colors.primaryHover;
              e.currentTarget.style.transform = 'scale(1.02)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.4)';
            }
          }}
          onMouseLeave={(e) => {
            if (!scanning) {
              e.currentTarget.style.backgroundColor = colors.primary;
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(37, 99, 235, 0.3)';
            }
          }}
        >
          {scanning ? 'Scanning...' : 'Scan'}
        </button>
      </div>
    </div>
  );
}
