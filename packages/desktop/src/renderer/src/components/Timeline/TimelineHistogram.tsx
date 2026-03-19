/**
 * TimelineHistogram - SVG bar chart of photo density over time.
 *
 * Two layers drawn bottom-up:
 *   1. All photos (including non-GPS) — grey, translucent
 *   2. GPS-only photos — blue, more opaque (drawn on top)
 *
 * All bars are the same colour regardless of the selected range.
 */

import type { ThemeColors } from '../../theme';

export interface HistogramBucket {
  bucket: number; // 0-based index
  count: number;
}

const BUCKET_COUNT = 100;

interface TimelineHistogramProps {
  gpsHistogram: HistogramBucket[];
  allHistogram: HistogramBucket[];
  colors: ThemeColors;
  height?: number;
}

export function TimelineHistogram({
  gpsHistogram,
  allHistogram,
  colors,
  height = 60,
}: TimelineHistogramProps) {
  // Build dense lookup arrays — missing buckets default to 0
  const gpsCounts = new Array<number>(BUCKET_COUNT).fill(0);
  const allCounts = new Array<number>(BUCKET_COUNT).fill(0);
  for (const { bucket, count } of gpsHistogram) {
    if (bucket >= 0 && bucket < BUCKET_COUNT) gpsCounts[bucket] = count;
  }
  for (const { bucket, count } of allHistogram) {
    if (bucket >= 0 && bucket < BUCKET_COUNT) allCounts[bucket] = count;
  }

  const maxAll = Math.max(...allCounts, 1); // avoid /0
  const maxBarHeight = height * 0.92; // 8% breathing room at top

  // Each bar occupies exactly 1 unit — no gap, bars touch each other.
  const barBodyWidth = 1;

  return (
    <svg
      width="100%"
      height={height}
      style={{ display: 'block' }}
      viewBox={`0 0 ${BUCKET_COUNT} ${height}`}
      preserveAspectRatio="none"
    >
      {/* Non-GPS photos layer (grey) — photos WITHOUT location data */}
      {allCounts.map((count, i) => {
        const nonGpsCount = count - gpsCounts[i];
        const barH = (nonGpsCount / maxAll) * maxBarHeight;
        if (barH < 0.5) return null;
        return (
          <rect
            key={`nongps-${i}`}
            x={i}
            y={height - barH}
            width={barBodyWidth}
            height={barH}
            fill={colors.textMuted}
            opacity={1.0} /* ← NON-GPS opacity: 0.0 (invisible) – 1.0 (solid) */
          />
        );
      })}

      {/* GPS-photos layer (primary blue) — photos WITH location data */}
      {gpsCounts.map((count, i) => {
        const barH = (count / maxAll) * maxBarHeight;
        if (barH < 0.5) return null;
        return (
          <rect
            key={`gps-${i}`}
            x={i}
            y={height - barH}
            width={barBodyWidth}
            height={barH}
            fill={colors.primary}
            opacity={0.5} /* ← GPS-ONLY opacity: 0.0 (invisible) – 1.0 (solid) */
          />
        );
      })}
    </svg>
  );
}

export { BUCKET_COUNT };
