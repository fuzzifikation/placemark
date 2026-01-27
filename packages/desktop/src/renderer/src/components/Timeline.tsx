/**
 * Timeline component - date range slider with play controls
 */

import { useEffect, useRef, useState } from 'react';
import { type Theme, getThemeColors } from '../theme';
import { TimelineControls } from './Timeline/TimelineControls';
import { TimelineSlider } from './Timeline/TimelineSlider';
import { useTimelineDrag } from './Timeline/useTimelineDrag';
import { useTimelinePlayback } from './Timeline/useTimelinePlayback';

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
  const sliderRef = useRef<HTMLDivElement>(null);
  const currentStart = useRef<number>(startDate);
  const currentEnd = useRef<number>(endDate);

  // Update local state when props change
  useEffect(() => {
    setLocalStart(startDate);
    setLocalEnd(endDate);
    currentStart.current = startDate;
    currentEnd.current = endDate;
  }, [startDate, endDate]);

  // Playback logic
  const { isPlaying, playSpeed, setIsPlaying, handlePlayPause, handleSpeedCycle } =
    useTimelinePlayback({
      minDate,
      maxDate,
      localStart,
      localEnd,
      setLocalStart,
      setLocalEnd,
      onRangeChange,
      updateInterval,
      currentStart,
      currentEnd,
    });

  // Drag logic
  const {
    isDragging,
    handlePointerDown,
    handleRangePointerDown,
    handlePointerMove,
    handlePointerUp,
  } = useTimelineDrag({
    minDate,
    maxDate,
    localStart,
    localEnd,
    setLocalStart,
    setLocalEnd,
    onRangeChange,
    setIsPlaying,
    currentStart,
    currentEnd,
    sliderRef,
  });

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
      <TimelineControls
        totalPhotos={totalPhotos}
        filteredPhotos={filteredPhotos}
        isPlaying={isPlaying}
        playSpeed={playSpeed}
        onPlayPause={handlePlayPause}
        onSpeedCycle={handleSpeedCycle}
        onClose={onClose}
        theme={theme}
      />
      <TimelineSlider
        minDate={minDate}
        maxDate={maxDate}
        localStart={localStart}
        localEnd={localEnd}
        isDragging={isDragging}
        sliderRef={sliderRef}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onRangePointerDown={handleRangePointerDown}
        onThumbPointerDown={handlePointerDown}
        theme={theme}
      />
    </div>
  );
}
