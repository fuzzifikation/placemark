/**
 * FloatingHeader - top navigation bar with controls
 *
 * Layout (left → right):
 *   [Branding] │ [🗑 Clear, 📁+ Add Folder] │ [⏱ Timeline] │ [◎ Select, 📁 Organize] │ [📊 Stats, ⚙️ Settings]
 */

import type { SelectionMode } from './MapView';
import {
  SPACING,
  BORDER_RADIUS,
  FONT_SIZE,
  FONT_WEIGHT,
  FONT_FAMILY,
  getGlassStyle,
} from '../constants/ui';
import {
  Lasso,
  FolderOpen,
  FolderPlus,
  Settings,
  History,
  BarChart3,
  Trash2,
  HelpCircle,
  Bookmark,
} from 'lucide-react';
import type { ThemeColors } from '../theme';

interface FloatingHeaderProps {
  photoCount: number;
  selectionCount: number;
  selectionMode: SelectionMode;
  dateRangeAvailable: boolean;
  showTimeline: boolean;
  showPlacemarks: boolean;
  scanning: boolean;
  colors: ThemeColors;
  glassBlur: number; // blur in pixels
  glassSurfaceOpacity: number; // 0-100
  onSelectionModeToggle: () => void;
  onOperationsOpen: () => void;
  onSettingsOpen: () => void;
  onStatsOpen: () => void;
  onTimelineToggle: () => void;
  onPlacemarksToggle: () => void;
  onScanFolder: () => void;
  onClearLibrary: () => void;
  onHelpOpen: () => void;
}

export function FloatingHeader({
  photoCount,
  selectionCount,
  selectionMode,
  dateRangeAvailable,
  showTimeline,
  showPlacemarks,
  scanning,
  colors,
  glassBlur,
  glassSurfaceOpacity,
  onSelectionModeToggle,
  onOperationsOpen,
  onSettingsOpen,
  onStatsOpen,
  onTimelineToggle,
  onPlacemarksToggle,
  onScanFolder,
  onClearLibrary,
  onHelpOpen,
}: FloatingHeaderProps) {
  // Reusable styles
  const divider = (
    <div
      style={{
        width: '1px',
        height: '40px',
        backgroundColor: colors.textMuted,
        opacity: 0.6,
        flexShrink: 0,
      }}
    />
  );

  const outlinedButtonBase: React.CSSProperties = {
    padding: `${SPACING.XS} ${SPACING.MD}`,
    fontSize: FONT_SIZE.SM,
    fontWeight: FONT_WEIGHT.MEDIUM,
    border: `1px solid ${colors.border}`,
    borderRadius: BORDER_RADIUS.LG,
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.SM,
    transform: 'scale(1)',
    fontFamily: FONT_FAMILY,
  };

  const iconButtonBase: React.CSSProperties = {
    padding: SPACING.SM,
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: BORDER_RADIUS.FULL,
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    transform: 'scale(1)',
  };

  const pillContainer: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.SM,
  };

  const iconButtonHoverOn = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = colors.surfaceHover;
    e.currentTarget.style.transform = 'scale(1.05)';
    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
  };
  const iconButtonHoverOff = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = 'transparent';
    e.currentTarget.style.transform = 'scale(1)';
    e.currentTarget.style.boxShadow = 'none';
  };

  // Shared hover handlers for all outlined (text+icon) buttons
  const outlinedHoverOn = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = colors.surfaceHover;
    e.currentTarget.style.transform = 'scale(1.02)';
  };
  const outlinedHoverOff = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = 'transparent';
    e.currentTarget.style.transform = 'scale(1)';
  };

  return (
    <div
      style={{
        padding: `${SPACING.SM} ${SPACING.LG}`,
        ...getGlassStyle(colors, glassBlur, glassSurfaceOpacity),
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.MD,
        transition: 'background-color 0.2s ease, border-color 0.2s ease',
      }}
    >
      {/* ── Group 1: Branding ─────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.SM }}>
        <img
          src="./icon.png"
          alt="Placemark"
          style={{ width: 32, height: 32, borderRadius: '4px', flexShrink: 0 }}
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

      {divider}

      {/* ── Group 2: Library DB — Clear & Add ────────────── */}
      <div style={pillContainer}>
        <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.SM }}>
          {/* Clear Library */}
          <button
            onClick={onClearLibrary}
            className="floating-header-button"
            style={{
              ...outlinedButtonBase,
              backgroundColor: 'transparent',
              color: colors.textPrimary,
            }}
            onMouseEnter={outlinedHoverOn}
            onMouseLeave={outlinedHoverOff}
            title="Clear library (remove all photos from database)"
          >
            <Trash2 size={16} />
            Clear
          </button>

          {/* Add Folder */}
          <button
            onClick={onScanFolder}
            disabled={scanning}
            className="floating-header-button"
            style={{
              ...outlinedButtonBase,
              backgroundColor: 'transparent',
              color: scanning ? colors.textMuted : colors.textPrimary,
              opacity: scanning ? 0.6 : 1,
              cursor: scanning ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (!scanning) outlinedHoverOn(e);
            }}
            onMouseLeave={(e) => {
              if (!scanning) outlinedHoverOff(e);
            }}
          >
            <FolderPlus size={16} />
            Add
          </button>
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: '-12px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: FONT_SIZE.XS,
            color: colors.textMuted,
            fontWeight: 400,
            fontFamily: FONT_FAMILY,
            whiteSpace: 'nowrap',
          }}
        >
          Library
        </div>
      </div>

      {divider}

      {/* ── Group 3: Timeline ─────────────────────────────── */}
      <button
        title={
          selectionMode === 'lasso'
            ? 'Timeline unavailable during selection'
            : !dateRangeAvailable
              ? 'No date information available in library'
              : showTimeline
                ? 'Hide Timeline'
                : 'Show Timeline'
        }
        onClick={onTimelineToggle}
        disabled={!dateRangeAvailable || selectionMode === 'lasso'}
        className="floating-header-button"
        style={{
          ...outlinedButtonBase,
          backgroundColor: showTimeline ? colors.primary : 'transparent',
          color: showTimeline ? colors.buttonText : colors.textPrimary,
          border: showTimeline ? 'none' : `1px solid ${colors.border}`,
          boxShadow: showTimeline ? '0 2px 8px rgba(37, 99, 235, 0.3)' : 'none',
          opacity: !dateRangeAvailable || selectionMode === 'lasso' ? 0.4 : 1,
          cursor: dateRangeAvailable && selectionMode !== 'lasso' ? 'pointer' : 'not-allowed',
        }}
        onMouseEnter={(e) => {
          if (dateRangeAvailable && selectionMode !== 'lasso' && !showTimeline) outlinedHoverOn(e);
        }}
        onMouseLeave={(e) => {
          if (!showTimeline) outlinedHoverOff(e);
        }}
      >
        <History size={16} />
        Timeline
      </button>

      <button
        title={showPlacemarks ? 'Hide Placemarks' : 'Show Placemarks'}
        onClick={onPlacemarksToggle}
        className="floating-header-button"
        style={{
          ...outlinedButtonBase,
          backgroundColor: showPlacemarks ? colors.primary : 'transparent',
          color: showPlacemarks ? colors.buttonText : colors.textPrimary,
          border: showPlacemarks ? 'none' : `1px solid ${colors.border}`,
          boxShadow: showPlacemarks ? '0 2px 8px rgba(37, 99, 235, 0.3)' : 'none',
        }}
        onMouseEnter={(e) => {
          if (!showPlacemarks) outlinedHoverOn(e);
        }}
        onMouseLeave={(e) => {
          if (!showPlacemarks) outlinedHoverOff(e);
        }}
      >
        <Bookmark size={16} />
        Placemarks
      </button>

      {divider}

      {/* ── Group 4: File Tools — Select & Organize ───────── */}
      <div style={pillContainer}>
        <div style={{ display: 'flex', gap: SPACING.SM }}>
          {/* Select (Lasso) */}
          <button
            title={
              selectionMode === 'lasso'
                ? 'Exit Selection Mode'
                : 'Enter Selection Mode (Shift+Drag to add, Alt+Drag to remove)'
            }
            onClick={onSelectionModeToggle}
            className="floating-header-button"
            style={{
              ...outlinedButtonBase,
              backgroundColor: selectionMode === 'lasso' ? colors.primary : 'transparent',
              color: selectionMode === 'lasso' ? colors.buttonText : colors.textPrimary,
              border: selectionMode === 'lasso' ? 'none' : `1px solid ${colors.border}`,
              boxShadow: selectionMode === 'lasso' ? '0 2px 8px rgba(37, 99, 235, 0.3)' : 'none',
            }}
            onMouseEnter={(e) => {
              if (selectionMode !== 'lasso') outlinedHoverOn(e);
            }}
            onMouseLeave={(e) => {
              if (selectionMode !== 'lasso') outlinedHoverOff(e);
            }}
          >
            <Lasso size={16} />
            Select
          </button>

          {/* Organize */}
          <button
            title="Organize selected photos (copy/move to folder)"
            onClick={onOperationsOpen}
            disabled={selectionCount === 0}
            className="floating-header-button"
            style={{
              ...outlinedButtonBase,
              backgroundColor: 'transparent',
              color: selectionCount === 0 ? colors.textMuted : colors.textPrimary,
              opacity: selectionCount === 0 ? 0.6 : 1,
              cursor: selectionCount > 0 ? 'pointer' : 'not-allowed',
            }}
            onMouseEnter={(e) => {
              if (selectionCount > 0) outlinedHoverOn(e);
            }}
            onMouseLeave={(e) => {
              if (selectionCount > 0) outlinedHoverOff(e);
            }}
          >
            <FolderOpen size={16} />
            Organize {selectionCount > 0 ? `(${selectionCount})` : ''}
          </button>
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: '-12px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: FONT_SIZE.XS,
            color: colors.textMuted,
            fontWeight: 400,
            fontFamily: FONT_FAMILY,
            whiteSpace: 'nowrap',
          }}
        >
          Tools
        </div>
      </div>

      {divider}

      {/* ── Group 5: App utilities — Stats & Settings ─────── */}
      <div style={{ display: 'flex', gap: SPACING.XS }}>
        <button
          onClick={onStatsOpen}
          className="floating-header-button"
          style={{ ...iconButtonBase, color: colors.textPrimary }}
          onMouseEnter={iconButtonHoverOn}
          onMouseLeave={iconButtonHoverOff}
          title="Library Statistics"
        >
          <BarChart3 size={18} />
        </button>

        <button
          onClick={onSettingsOpen}
          className="floating-header-button"
          style={{ ...iconButtonBase, color: colors.textPrimary }}
          onMouseEnter={iconButtonHoverOn}
          onMouseLeave={iconButtonHoverOff}
          title="Settings"
        >
          <Settings size={18} />
        </button>

        <button
          onClick={onHelpOpen}
          className="floating-header-button"
          style={{ ...iconButtonBase, color: colors.textPrimary }}
          onMouseEnter={iconButtonHoverOn}
          onMouseLeave={iconButtonHoverOff}
          title="Keyboard shortcuts"
        >
          <HelpCircle size={18} />
        </button>
      </div>
    </div>
  );
}
