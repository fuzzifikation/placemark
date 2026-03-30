/**
 * Timeline component - date range slider with play controls
 */

import { useEffect, useRef, useState } from 'react';
import { type Theme } from '../theme';
import { useThemeColors } from '../hooks/useThemeColors';
import { TimelineControls } from './Timeline/TimelineControls';
import { TimelineSlider } from './Timeline/TimelineSlider';
import { TimelineHistogram } from './Timeline/TimelineHistogram';
import { useTimelineDrag } from './Timeline/useTimelineDrag';
import { useTimelinePlayback } from './Timeline/useTimelinePlayback';
import { useHistogram } from '../hooks/useHistogram';

interface TimelineProps {
  minDate: number; // Unix milliseconds
  maxDate: number; // Unix milliseconds
  startDate: number;
  endDate: number;
  totalPhotos: number;
  filteredPhotos: number;
  onRangeChange: (start: number, end: number) => void;
  onClose: () => void;
  updateInterval: number; // milliseconds between map updates during playback - from settings
  playSpeedSlowMs: number;
  playSpeedMediumMs: number;
  playSpeedFastMs: number;
  theme: Theme;
  autoZoomDuringPlay: boolean;
  onAutoZoomToggle: () => void;
  onPlayingChange?: (isPlaying: boolean) => void;
  /** When provided, shows a "Fit to view" button in the controls bar. */
  onFitToView?: () => void;
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
  updateInterval,
  playSpeedSlowMs,
  playSpeedMediumMs,
  playSpeedFastMs,
  theme,
  autoZoomDuringPlay,
  onAutoZoomToggle,
  onPlayingChange,
  onFitToView,
}: TimelineProps) {
  const [localStart, setLocalStart] = useState(startDate);
  const [localEnd, setLocalEnd] = useState(endDate);
  const sliderRef = useRef<HTMLDivElement>(null as unknown as HTMLDivElement);
  const currentStart = useRef<number>(startDate);
  const currentEnd = useRef<number>(endDate);
  const colors = useThemeColors(theme);

  // Histogram data — fetched from SQLite via IPC
  const { gpsHistogram, allHistogram } = useHistogram(minDate, maxDate);

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
      playSpeedSlowMs,
      playSpeedMediumMs,
      playSpeedFastMs,
      currentStart,
      currentEnd,
    });

  // Notify parent when playback state changes
  useEffect(() => {
    onPlayingChange?.(isPlaying);
  }, [isPlaying, onPlayingChange]);

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
        height: 'auto',
        minHeight: '100px',
        backgroundColor: 'transparent',
        padding: '0.25rem 0.5rem 0.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        width: '100%',
      }}
    >
      <TimelineControls
        totalPhotos={totalPhotos}
        filteredPhotos={filteredPhotos}
        minDate={minDate}
        maxDate={maxDate}
        isPlaying={isPlaying}
        playSpeed={playSpeed}
        onPlayPause={handlePlayPause}
        onSpeedCycle={handleSpeedCycle}
        onClose={onClose}
        theme={theme}
        autoZoomDuringPlay={autoZoomDuringPlay}
        onAutoZoomToggle={onAutoZoomToggle}
        onFitToView={onFitToView}
      />
      {/* Histogram overlaid behind the slider in the same coordinate space.
          TUNE: HISTOGRAM_HEIGHT controls bar height (px). HISTOGRAM_TOP_OFFSET shifts bars down toward the track. */}
      {/* eslint-disable-next-line @typescript-eslint/no-inferrable-types */}
      <div style={{ position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            top: -8 /* ← HISTOGRAM_TOP_OFFSET: 0–30px */,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
          }}
        >
          <TimelineHistogram
            gpsHistogram={gpsHistogram}
            allHistogram={allHistogram}
            colors={colors}
            height={40} /* ← HISTOGRAM_HEIGHT: px, try 40–100 */
          />
        </div>
        <TimelineSlider
          minDate={minDate}
          maxDate={maxDate}
          localStart={localStart}
          localEnd={localEnd}
          isDragging={isDragging}
          isPlaying={isPlaying}
          sliderRef={sliderRef}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onRangePointerDown={handleRangePointerDown}
          onThumbPointerDown={handlePointerDown}
          theme={theme}
        />
      </div>
    </div>
  );
}
