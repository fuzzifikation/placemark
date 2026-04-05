/**
 * TimelineSlider - Draggable date range slider with thumbs and labels
 */

import { useRef } from 'react';
import { type Theme } from '../../theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { formatDateWithOptions } from '../../utils/formatLocale';

// Format timestamp for display
function formatDate(timestamp: number): string {
  return formatDateWithOptions(timestamp, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Fraction of track width below which the two labels are merged into one.
// At ~800px track width this is ≈160px — enough room for two date strings.

interface TimelineSliderProps {
  minDate: number;
  maxDate: number;
  localStart: number;
  localEnd: number;
  isDragging: 'start' | 'end' | 'range' | null;
  isPlaying?: boolean;
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
  isPlaying = false,
  sliderRef,
  onPointerMove,
  onPointerUp,
  onRangePointerDown,
  onThumbPointerDown,
  theme,
}: TimelineSliderProps) {
  const colors = useThemeColors(theme);
  const sliderWidthRef = useRef<number>(800);

  // Convert timestamp to position (0-1)
  const timestampToPosition = (timestamp: number): number => {
    return (timestamp - minDate) / (maxDate - minDate);
  };

  const startPosition = timestampToPosition(localStart);
  const endPosition = timestampToPosition(localEnd);

  // Merge labels when thumbs are too close to read both independently.
  // Use actual pixel width when available, fall back to 800px estimate.
  const gapFraction = endPosition - startPosition;
  const trackWidth = sliderWidthRef.current;
  const gapPx = gapFraction * trackWidth;
  const mergeLabels = gapPx < 160;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div
        ref={(el) => {
          (sliderRef as React.MutableRefObject<HTMLDivElement>).current = el!;
          if (el) sliderWidthRef.current = el.offsetWidth;
        }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          position: 'relative',
          height: '40px',
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
            transition: isDragging || isPlaying ? 'none' : 'background-color 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (!isDragging) {
              e.currentTarget.style.backgroundColor = colors.primaryHover;
            }
          }}
          onMouseLeave={(e) => {
            if (!isDragging) {
              e.currentTarget.style.backgroundColor = colors.primary;
            }
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
            transition: isDragging || isPlaying ? 'none' : 'all 0.2s ease',
            transform: isDragging === 'start' ? 'scale(1.2)' : 'scale(1)',
          }}
          onMouseEnter={(e) => {
            if (!isDragging) {
              e.currentTarget.style.transform = 'scale(1.1)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.4)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isDragging) {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
            }
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
            transition: isDragging || isPlaying ? 'none' : 'all 0.2s ease',
            transform: isDragging === 'end' ? 'scale(1.2)' : 'scale(1)',
          }}
          onMouseEnter={(e) => {
            if (!isDragging) {
              e.currentTarget.style.transform = 'scale(1.1)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.4)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isDragging) {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
            }
          }}
        />
        {/* Date labels — merged when thumbs are too close, split otherwise */}
        {mergeLabels ? (
          <div
            style={{
              position: 'absolute',
              left: `${((startPosition + endPosition) / 2) * 100}%`,
              bottom: '-30px',
              transform: 'translateX(-50%)',
              fontSize: '0.75rem',
              color: colors.primary,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
            }}
          >
            {formatDate(localStart) === formatDate(localEnd)
              ? formatDate(localStart)
              : `${formatDate(localStart)} – ${formatDate(localEnd)}`}
          </div>
        ) : (
          <>
            <div
              style={{
                position: 'absolute',
                left: `${startPosition * 100}%`,
                bottom: '-30px',
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
            <div
              style={{
                position: 'absolute',
                left: `${endPosition * 100}%`,
                bottom: '-30px',
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
          </>
        )}
      </div>
    </div>
  );
}
