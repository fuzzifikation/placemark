/**
 * TimelineControls - Play/pause controls, speed selector, and close button
 */

import { type Theme, getThemeColors } from '../../theme';

export type PlaySpeed = 'week' | 'month' | 'sixMonths';

export const PLAY_SPEEDS: Record<PlaySpeed, { increment: number; label: string }> = {
  week: { increment: 7 * 24 * 60 * 60 * 1000, label: '▶' },
  month: { increment: 30 * 24 * 60 * 60 * 1000, label: '▶▶' },
  sixMonths: { increment: 180 * 24 * 60 * 60 * 1000, label: '▶▶▶' },
};

interface TimelineControlsProps {
  totalPhotos: number;
  filteredPhotos: number;
  isPlaying: boolean;
  playSpeed: PlaySpeed;
  onPlayPause: () => void;
  onSpeedCycle: () => void;
  onClose: () => void;
  theme: Theme;
}

export function TimelineControls({
  totalPhotos,
  filteredPhotos,
  isPlaying,
  playSpeed,
  onPlayPause,
  onSpeedCycle,
  onClose,
  theme,
}: TimelineControlsProps) {
  const colors = getThemeColors(theme);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <span style={{ fontSize: '0.875rem', fontWeight: 500, color: colors.textPrimary }}>
        Timeline: {filteredPhotos} of {totalPhotos} photos
      </span>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <button
          onClick={isPlaying ? onPlayPause : onSpeedCycle}
          disabled={isPlaying}
          style={{
            padding: '0.25rem 0.5rem',
            fontSize: '0.75rem',
            backgroundColor: isPlaying ? colors.surfaceHover : colors.surface,
            color: colors.textPrimary,
            border: `1px solid ${colors.border}`,
            borderRadius: '4px',
            cursor: isPlaying ? 'default' : 'pointer',
            transition: 'all 0.2s ease',
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
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.primaryHover)}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colors.primary)}
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
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.surfaceHover)}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colors.surface)}
        >
          ×
        </button>
      </div>
    </div>
  );
}
