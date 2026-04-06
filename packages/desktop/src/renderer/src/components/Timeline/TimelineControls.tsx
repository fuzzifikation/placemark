/**
 * TimelineControls - Play/pause controls, speed selector, and close button
 */

import { CalendarRange } from 'lucide-react';
import { type Theme } from '../../theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { formatDateWithOptions } from '../../utils/formatLocale';

export type PlaySpeed = 'week' | 'month' | 'sixMonths';

export const PLAY_SPEEDS: Record<PlaySpeed, { increment: number; label: string }> = {
  week: { increment: 7 * 24 * 60 * 60 * 1000, label: '▶' },
  month: { increment: 30 * 24 * 60 * 60 * 1000, label: '▶▶' },
  sixMonths: { increment: 180 * 24 * 60 * 60 * 1000, label: '▶▶▶' },
};

interface TimelineControlsProps {
  totalPhotos: number;
  filteredPhotos: number;
  minDate: number;
  maxDate: number;
  isPlaying: boolean;
  playSpeed: PlaySpeed;
  onPlayPause: () => void;
  onSpeedCycle: () => void;
  onClose: () => void;
  theme: Theme;
  autoZoomDuringPlay: boolean;
  onAutoZoomToggle: () => void;
  /** When provided, shows a button that snaps the timeline thumbs to span the full library date range (oldest → youngest). */
  onFitToView?: () => void;
}

export function TimelineControls({
  totalPhotos,
  filteredPhotos,
  minDate,
  maxDate,
  isPlaying,
  playSpeed,
  onPlayPause,
  onSpeedCycle,
  onClose,
  theme,
  autoZoomDuringPlay,
  onAutoZoomToggle,
  onFitToView,
}: TimelineControlsProps) {
  const colors = useThemeColors(theme);
  const isDark = theme === 'dark';

  // Toggle switch colors
  const trackBg = autoZoomDuringPlay ? '#0066cc' : isDark ? '#334155' : '#cbd5e1';
  const knobColor = '#ffffff';

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <div
        style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', paddingTop: '0.25rem' }}
      >
        <span style={{ fontSize: '0.875rem', fontWeight: 500, color: colors.textPrimary }}>
          Showing: {filteredPhotos} of {totalPhotos} photos
        </span>
        <span style={{ fontSize: '0.7rem', color: colors.textMuted }}>
          {'All: '}
          {formatDateWithOptions(minDate, { year: 'numeric', month: 'short', day: 'numeric' })}
          {' – '}
          {formatDateWithOptions(maxDate, { year: 'numeric', month: 'short', day: 'numeric' })}
        </span>
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        {/* Auto Zoom Toggle */}
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.75rem',
            color: colors.textPrimary,
            cursor: 'pointer',
            userSelect: 'none',
          }}
          onClick={onAutoZoomToggle}
          title="Automatically zoom and pan map to follow your journey during playback"
        >
          <div
            style={{
              position: 'relative',
              width: '36px',
              height: '20px',
              backgroundColor: trackBg,
              borderRadius: '10px',
              transition: 'background-color 0.2s ease',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '2px',
                left: autoZoomDuringPlay ? '18px' : '2px',
                width: '16px',
                height: '16px',
                backgroundColor: knobColor,
                borderRadius: '50%',
                transition: 'left 0.2s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }}
            />
          </div>
          <span>Auto Zoom</span>
        </label>
        {onFitToView && (
          <button
            onClick={onFitToView}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.25rem 0.4rem',
              backgroundColor: colors.surface,
              color: colors.textPrimary,
              border: `1px solid ${colors.border}`,
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: 'scale(1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.backgroundColor = colors.surfaceHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.backgroundColor = colors.surface;
            }}
            title="Fit timeline to full photo date range (oldest → youngest)"
          >
            <span style={{ fontSize: '0.75rem', fontWeight: 700, lineHeight: 1 }}>[</span>
            <CalendarRange size={14} />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, lineHeight: 1 }}>]</span>
          </button>
        )}
        <button
          onClick={onSpeedCycle}
          style={{
            padding: '0.25rem 0.5rem',
            fontSize: '0.75rem',
            backgroundColor: colors.surface,
            color: colors.textPrimary,
            border: `1px solid ${colors.border}`,
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: 'scale(1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.backgroundColor = colors.surfaceHover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.backgroundColor = colors.surface;
          }}
          title="Cycle speed"
        >
          {PLAY_SPEEDS[playSpeed].label}
        </button>
        <button
          onClick={onPlayPause}
          style={{
            padding: '0.25rem 0.75rem',
            fontSize: '0.875rem',
            backgroundColor: colors.primary,
            color: colors.buttonText,
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: 'scale(1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.backgroundColor = colors.primaryHover;
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.backgroundColor = colors.primary;
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>
        <button
          onClick={onClose}
          style={{
            padding: '0.25rem 0.5rem',
            fontSize: '0.875rem',
            backgroundColor: colors.surface,
            color: colors.textPrimary,
            border: `1px solid ${colors.border}`,
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: 'scale(1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.backgroundColor = colors.surfaceHover;
            e.currentTarget.style.color = colors.error || '#dc3545';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.backgroundColor = colors.surface;
            e.currentTarget.style.color = colors.textPrimary;
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
