/**
 * TimelineSlider - Draggable date range slider with thumbs and labels
 */

import { type Theme, getThemeColors } from '../../theme';

// Format timestamp for display
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

interface TimelineSliderProps {
  minDate: number;
  maxDate: number;
  localStart: number;
  localEnd: number;
  isDragging: 'start' | 'end' | 'range' | null;
  sliderRef: React.RefObject<HTMLDivElement>;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: () => void;
  onRangePointerDown: (e: React.PointerEvent) => void;
  onThumbPointerDown: (thumb: 'start' | 'end') => (e: React.PointerEvent) => void;
  theme: Theme;
}

export function TimelineSlider({
  minDate,
  maxDate,
  localStart,
  localEnd,
  isDragging,
  sliderRef,
  onPointerMove,
  onPointerUp,
  onRangePointerDown,
  onThumbPointerDown,
  theme,
}: TimelineSliderProps) {
  const colors = getThemeColors(theme);

  // Convert timestamp to position (0-1)
  const timestampToPosition = (timestamp: number): number => {
    return (timestamp - minDate) / (maxDate - minDate);
  };

  const startPosition = timestampToPosition(localStart);
  const endPosition = timestampToPosition(localEnd);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div
        ref={sliderRef}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          position: 'relative',
          height: '60px',
          cursor: isDragging ? 'grabbing' : 'default',
        }}
      >
        {/* Track */}
        <div
          style={{
            position: 'absolute',
            top: '38px',
            left: 0,
            right: 0,
            height: '4px',
            backgroundColor: colors.borderLight,
            borderRadius: '2px',
          }}
        />
        {/* Selected range - draggable */}
        <div
          onPointerDown={onRangePointerDown}
          style={{
            position: 'absolute',
            top: '34px',
            left: `${startPosition * 100}%`,
            width: `${(endPosition - startPosition) * 100}%`,
            height: '12px',
            backgroundColor: colors.primary,
            borderRadius: '6px',
            cursor: isDragging === 'range' ? 'grabbing' : 'grab',
            touchAction: 'none',
          }}
        />
        {/* Start thumb - vertical bar */}
        <div
          onPointerDown={onThumbPointerDown('start')}
          style={{
            position: 'absolute',
            left: `${startPosition * 100}%`,
            top: '26px',
            width: '4px',
            height: '28px',
            marginLeft: '-2px',
            backgroundColor: colors.primary,
            borderRadius: '2px',
            cursor: 'ew-resize',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            touchAction: 'none',
            border: `1px solid ${colors.surface}`,
          }}
        />
        {/* End thumb - vertical bar */}
        <div
          onPointerDown={onThumbPointerDown('end')}
          style={{
            position: 'absolute',
            left: `${endPosition * 100}%`,
            top: '26px',
            width: '4px',
            height: '28px',
            marginLeft: '-2px',
            backgroundColor: colors.primary,
            borderRadius: '2px',
            cursor: 'ew-resize',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            touchAction: 'none',
            border: `1px solid ${colors.surface}`,
          }}
        />
        {/* Start date label - moves with thumb */}
        <div
          style={{
            position: 'absolute',
            left: `${startPosition * 100}%`,
            top: '0px',
            transform: 'translateX(-50%)',
            fontSize: '0.75rem',
            color: colors.primary,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          {formatDate(localStart)}
        </div>
        {/* End date label - moves with thumb */}
        <div
          style={{
            position: 'absolute',
            left: `${endPosition * 100}%`,
            top: '0px',
            transform: 'translateX(-50%)',
            fontSize: '0.75rem',
            color: colors.primary,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          {formatDate(localEnd)}
        </div>
        {/* Timeline boundary dates - fixed */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            bottom: '0px',
            fontSize: '0.7rem',
            color: colors.textMuted,
          }}
        >
          {formatDate(minDate)}
        </div>
        <div
          style={{
            position: 'absolute',
            right: 0,
            bottom: '0px',
            fontSize: '0.7rem',
            color: colors.textMuted,
          }}
        >
          {formatDate(maxDate)}
        </div>
      </div>
    </div>
  );
}
