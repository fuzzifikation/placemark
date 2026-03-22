/**
 * useHistogram — fetches photo histogram data from SQLite via IPC.
 *
 * Extracted from Timeline component to separate data fetching from UI logic.
 */

import { useState, useEffect } from 'react';
import { BUCKET_COUNT, type HistogramBucket } from '../components/Timeline/TimelineHistogram';

interface HistogramResult {
  gpsHistogram: HistogramBucket[];
  allHistogram: HistogramBucket[];
}

export function useHistogram(minDate: number, maxDate: number): HistogramResult {
  const [gpsHistogram, setGpsHistogram] = useState<HistogramBucket[]>([]);
  const [allHistogram, setAllHistogram] = useState<HistogramBucket[]>([]);

  useEffect(() => {
    if (maxDate <= minDate) return;
    let cancelled = false;
    Promise.all([
      window.api.photos.getHistogram(minDate, maxDate, BUCKET_COUNT, true),
      window.api.photos.getHistogram(minDate, maxDate, BUCKET_COUNT, false),
    ])
      .then(([gps, all]) => {
        if (cancelled) return;
        setGpsHistogram(gps);
        setAllHistogram(all);
      })
      .catch(() => {
        if (!cancelled) {
          setGpsHistogram([]);
          setAllHistogram([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [minDate, maxDate]);

  return { gpsHistogram, allHistogram };
}
