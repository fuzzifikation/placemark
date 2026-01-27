/**
 * useTimelinePlayback - Handle timeline animation and playback
 */

import { useState, useEffect, useRef } from 'react';
import { type PlaySpeed, PLAY_SPEEDS } from './TimelineControls';

interface UseTimelinePlaybackParams {
  minDate: number;
  maxDate: number;
  localStart: number;
  localEnd: number;
  setLocalStart: (value: number) => void;
  setLocalEnd: (value: number) => void;
  onRangeChange: (start: number, end: number) => void;
  updateInterval: number;
  currentStart: React.MutableRefObject<number>;
  currentEnd: React.MutableRefObject<number>;
}

export function useTimelinePlayback({
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
}: UseTimelinePlaybackParams) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState<PlaySpeed>('week');
  const animationFrame = useRef<number | null>(null);
  const lastUpdateTime = useRef<number>(0);

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
  }, [
    isPlaying,
    playSpeed,
    minDate,
    maxDate,
    onRangeChange,
    updateInterval,
    setLocalStart,
    setLocalEnd,
    currentStart,
    currentEnd,
  ]);

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

  return {
    isPlaying,
    playSpeed,
    setIsPlaying,
    handlePlayPause,
    handleSpeedCycle,
  };
}
