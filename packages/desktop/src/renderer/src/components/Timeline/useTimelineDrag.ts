/**
 * useTimelineDrag - Handle drag interactions for timeline slider
 */

import { useState, useRef, useCallback } from 'react';
import { MIN_RANGE_GAP_MS, DEBOUNCE_DELAY_MS, positionToTimestamp } from './timelineUtils';

interface UseTimelineDragParams {
  minDate: number;
  maxDate: number;
  localStart: number;
  localEnd: number;
  setLocalStart: (value: number) => void;
  setLocalEnd: (value: number) => void;
  onRangeChange: (start: number, end: number) => void;
  setIsPlaying: (value: boolean) => void;
  currentStart: React.MutableRefObject<number>;
  currentEnd: React.MutableRefObject<number>;
  sliderRef: React.RefObject<HTMLDivElement>;
}

export function useTimelineDrag({
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
}: UseTimelineDragParams) {
  const [isDragging, setIsDragging] = useState<'start' | 'end' | 'range' | null>(null);
  const [dragStartPosition, setDragStartPosition] = useState<{
    start: number;
    end: number;
    clientX: number;
  } | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

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
      const timestamp = positionToTimestamp(position, minDate, maxDate);

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

  return {
    isDragging,
    handlePointerDown,
    handleRangePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
