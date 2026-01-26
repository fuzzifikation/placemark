/**
 * Timeline component - date range slider with play controls
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { type Theme, getThemeColors } from '../theme';

// Timeline constants
const MIN_RANGE_GAP_MS = 1000; // Minimum 1 second gap between start and end
const DEBOUNCE_DELAY_MS = 100; // Debounce delay for range change notifications

interface TimelineProps {
  minDate: number; // Unix milliseconds
  maxDate: number; // Unix milliseconds
  startDate: number;
  endDate: number;
  totalPhotos: number;
  filteredPhotos: number;
  onRangeChange: (start: number, end: number) => void;
  onClose: () => void;
  updateInterval?: number; // milliseconds between map updates during playback
  theme: Theme;
}

type PlaySpeed = 'week' | 'month' | 'sixMonths';

const PLAY_SPEEDS: Record<PlaySpeed, { increment: number; label: string }> = {
  week: { increment: 7 * 24 * 60 * 60 * 1000, label: '▶' },
  month: { increment: 30 * 24 * 60 * 60 * 1000, label: '▶▶' },
  sixMonths: { increment: 180 * 24 * 60 * 60 * 1000, label: '▶▶▶' },
};

export function Timeline({
  minDate,
  maxDate,
  startDate,
  endDate,
  totalPhotos,
  filteredPhotos,
  onRangeChange,
  onClose,
  updateInterval = 100,
  theme,
}: TimelineProps) {
  const colors = getThemeColors(theme);
  const [localStart, setLocalStart] = useState(startDate);
  const [localEnd, setLocalEnd] = useState(endDate);
  const [isDragging, setIsDragging] = useState<'start' | 'end' | 'range' | null>(null);
  const [dragStartPosition, setDragStartPosition] = useState<{
    start: number;
    end: number;
    clientX: number;
  } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState<PlaySpeed>('week');
  const sliderRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const animationFrame = useRef<number | null>(null);
  const lastUpdateTime = useRef<number>(0);
  const currentStart = useRef<number>(startDate);
  const currentEnd = useRef<number>(endDate);

  // Update local state when props change
  useEffect(() => {
    setLocalStart(startDate);
    setLocalEnd(endDate);
    currentStart.current = startDate;
    currentEnd.current = endDate;
  }, [startDate, endDate]);

  // Debounced update to parent
  const notifyRangeChange = useCallback(
    (start: number, end: number) => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      debounceTimer.current = setTimeout(() => {
        onRangeChange(start, end);
      }, DEBOUNCE_DELAY_MS);
    },
    [onRangeChange]
  );

  // Convert position (0-1) to timestamp
  const positionToTimestamp = (position: number): number => {
    return minDate + position * (maxDate - minDate);
  };

  // Convert timestamp to position (0-1)
  const timestampToPosition = (timestamp: number): number => {
    return (timestamp - minDate) / (maxDate - minDate);
  };

  // Handle mouse/touch events for dragging
  const handlePointerDown = (thumb: 'start' | 'end') => (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(thumb);
    setIsPlaying(false); // Pause playback if dragging
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleRangePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging('range');
    setIsPlaying(false);
    setDragStartPosition({
      start: localStart,
      end: localEnd,
      clientX: e.clientX,
    });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !sliderRef.current) return;

    const rect = sliderRef.current.getBoundingClientRect();

    if (isDragging === 'range' && dragStartPosition) {
      // Drag the entire range
      const deltaX = e.clientX - dragStartPosition.clientX;
      const deltaTime = (deltaX / rect.width) * (maxDate - minDate);
      let newStart = dragStartPosition.start + deltaTime;
      let newEnd = dragStartPosition.end + deltaTime;

      // Keep within bounds
      if (newStart < minDate) {
        newStart = minDate;
        newEnd = minDate + (dragStartPosition.end - dragStartPosition.start);
      }
      if (newEnd > maxDate) {
        newEnd = maxDate;
        newStart = maxDate - (dragStartPosition.end - dragStartPosition.start);
      }

      currentStart.current = newStart;
      currentEnd.current = newEnd;
      setLocalStart(newStart);
      setLocalEnd(newEnd);
      notifyRangeChange(newStart, newEnd);
    } else {
      // Drag individual thumb
      const position = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const timestamp = positionToTimestamp(position);

      if (isDragging === 'start') {
        const newStart = Math.min(timestamp, localEnd - MIN_RANGE_GAP_MS);
        currentStart.current = newStart;
        setLocalStart(newStart);
        notifyRangeChange(newStart, localEnd);
      } else if (isDragging === 'end') {
        const newEnd = Math.max(timestamp, localStart + MIN_RANGE_GAP_MS);
        currentEnd.current = newEnd;
        setLocalEnd(newEnd);
        notifyRangeChange(localStart, newEnd);
      }
    }
  };

  const handlePointerUp = () => {
    setIsDragging(null);
    setDragStartPosition(null);
  };

  // Play animation
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
        animationFrame.current = null;
      }
      return;
    }

    const increment = PLAY_SPEEDS[playSpeed].increment;
    const windowSize = currentEnd.current - currentStart.current;
    let lastTime = Date.now();
    lastUpdateTime.current = Date.now();

    const animate = () => {
      const now = Date.now();
      const deltaTime = now - lastTime;
      lastTime = now;

      // Move window forward (1 second real time = increment milliseconds in data time)
      const step = (increment / 1000) * deltaTime;
      let newStart = currentStart.current + step;
      let newEnd = currentEnd.current + step;

      // Stop at the end
      if (newEnd >= maxDate) {
        newStart = maxDate - windowSize;
        newEnd = maxDate;
        setIsPlaying(false);
      }

      // Update refs for next frame
      currentStart.current = newStart;
      currentEnd.current = newEnd;

      // Update UI state
      setLocalStart(newStart);
      setLocalEnd(newEnd);

      // Throttle map updates based on updateInterval setting
      if (now - lastUpdateTime.current >= updateInterval) {
        onRangeChange(newStart, newEnd);
        lastUpdateTime.current = now;
      }

      if (newEnd < maxDate) {
        animationFrame.current = requestAnimationFrame(animate);
      }
    };

    animationFrame.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [isPlaying, playSpeed, minDate, maxDate, onRangeChange, updateInterval]);

  // Toggle play/pause
  const handlePlayPause = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      // If at the end, reset to beginning
      if (localEnd >= maxDate) {
        const windowSize = localEnd - localStart;
        currentStart.current = minDate;
        currentEnd.current = minDate + windowSize;
        setLocalStart(minDate);
        setLocalEnd(minDate + windowSize);
      }
      setIsPlaying(true);
    }
  };

  // Cycle play speed
  const handleSpeedCycle = () => {
    const speeds: PlaySpeed[] = ['week', 'month', 'sixMonths'];
    const currentIndex = speeds.indexOf(playSpeed);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    setPlaySpeed(nextSpeed);
  };

  // Format date for display
  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const startPosition = timestampToPosition(localStart);
  const endPosition = timestampToPosition(localEnd);

  return (
    <div
      style={{
        height: '15vh',
        minHeight: '120px',
        backgroundColor: colors.surface,
        borderTop: `1px solid ${colors.border}`,
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        transition: 'background-color 0.2s ease',
      }}
    >
      {/* Header */}
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
            onClick={isPlaying ? handlePlayPause : handleSpeedCycle}
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
            onClick={handlePlayPause}
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

      {/* Slider */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div
          ref={sliderRef}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
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
            onPointerDown={handleRangePointerDown}
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
            onPointerDown={handlePointerDown('start')}
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
            onPointerDown={handlePointerDown('end')}
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
    </div>
  );
}
