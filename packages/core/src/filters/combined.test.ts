import { describe, it, expect } from 'vitest';
import { filterPhotos } from './combined';
import type { Photo } from '../models/Photo';

function photo(
  id: number,
  lat: number | null,
  lon: number | null,
  timestamp: number | null = null
): Photo {
  return {
    id,
    source: 'local',
    path: `/test${id}.jpg`,
    latitude: lat,
    longitude: lon,
    timestamp,
    fileHash: null,
    scannedAt: Date.now(),
    fileSize: 1000,
    mimeType: 'image/jpeg',
  };
}

const paris = photo(1, 48.8, 2.3, 1_000_000);
const newYork = photo(2, 40.7, -74.0, 2_000_000);
const noLocation = photo(3, null, null, 3_000_000);
const noTimestamp = photo(4, 51.5, -0.1, null); // London, no date

describe('filterPhotos', () => {
  it('returns all photos when no filters are active', () => {
    expect(filterPhotos([paris, newYork, noLocation], {})).toHaveLength(3);
  });

  it('filters by bounding box', () => {
    const europe = { north: 55, south: 35, east: 30, west: -10 };
    const result = filterPhotos([paris, newYork, noLocation], { bounds: europe });
    expect(result).toEqual([paris]);
  });

  it('excludes photos without location from bounds filtering', () => {
    const world = { north: 90, south: -90, east: 180, west: -180 };
    const result = filterPhotos([paris, noLocation], { bounds: world });
    expect(result).toEqual([paris]);
  });

  it('filters by date range', () => {
    const result = filterPhotos([paris, newYork, noLocation], {
      dateRange: { start: 500_000, end: 1_500_000 },
    });
    expect(result).toEqual([paris]);
  });

  it('excludes photos without timestamp from date filtering', () => {
    const result = filterPhotos([paris, noTimestamp], {
      dateRange: { start: 0, end: 9_999_999 },
    });
    expect(result).toEqual([paris]);
  });

  it('applies bounds AND date range together', () => {
    const result = filterPhotos([paris, newYork], {
      bounds: { north: 55, south: 35, east: 30, west: -10 },
      dateRange: { start: 500_000, end: 1_500_000 },
    });
    expect(result).toEqual([paris]);
  });

  it('returns empty array when no photos match', () => {
    const result = filterPhotos([paris], {
      dateRange: { start: 9_000_000, end: 9_999_999 },
    });
    expect(result).toEqual([]);
  });
});
