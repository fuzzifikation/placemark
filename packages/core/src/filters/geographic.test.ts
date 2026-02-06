import { describe, it, expect } from 'vitest';
import { isPhotoInBounds, buildBoundsQuery } from './geographic';
import type { Photo } from '../models/Photo';
import type { BoundingBox } from './geographic';

/** Helper to create a minimal Photo with location */
function photo(lat: number | null, lon: number | null): Photo {
  return {
    id: 1,
    source: 'local',
    path: '/test.jpg',
    latitude: lat,
    longitude: lon,
    timestamp: null,
    fileHash: null,
    scannedAt: Date.now(),
    fileSize: 1000,
    mimeType: 'image/jpeg',
  };
}

describe('isPhotoInBounds', () => {
  const europe: BoundingBox = { north: 55, south: 35, east: 30, west: -10 };

  it('includes photo inside bounds', () => {
    expect(isPhotoInBounds(photo(48.8, 2.3), europe)).toBe(true); // Paris
  });

  it('excludes photo outside bounds', () => {
    expect(isPhotoInBounds(photo(40.7, -74.0), europe)).toBe(false); // New York
  });

  it('excludes photo with null coordinates', () => {
    expect(isPhotoInBounds(photo(null, null), europe)).toBe(false);
    expect(isPhotoInBounds(photo(48.8, null), europe)).toBe(false);
    expect(isPhotoInBounds(photo(null, 2.3), europe)).toBe(false);
  });

  describe('International Date Line crossing', () => {
    // Box spanning from eastern Russia (170°E) to Alaska (-160°E / 200°E)
    const idlBox: BoundingBox = { north: 65, south: 50, east: -160, west: 170 };

    it('includes photo east of IDL (Russia side)', () => {
      expect(isPhotoInBounds(photo(55, 175), idlBox)).toBe(true);
    });

    it('includes photo west of IDL (Alaska side)', () => {
      expect(isPhotoInBounds(photo(55, -165), idlBox)).toBe(true);
    });

    it('excludes photo in the middle (e.g. Europe)', () => {
      expect(isPhotoInBounds(photo(55, 10), idlBox)).toBe(false);
    });

    it('excludes photo outside latitude range', () => {
      expect(isPhotoInBounds(photo(30, 175), idlBox)).toBe(false);
    });
  });
});

describe('buildBoundsQuery', () => {
  it('produces standard SQL for normal bounding box', () => {
    const result = buildBoundsQuery({ north: 55, south: 35, east: 30, west: -10 });
    expect(result.sql).toBe('latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ?');
    expect(result.params).toEqual([35, 55, -10, 30]);
  });

  it('produces OR-based longitude SQL for IDL crossing', () => {
    const result = buildBoundsQuery({ north: 65, south: 50, east: -160, west: 170 });
    expect(result.sql).toBe('latitude BETWEEN ? AND ? AND (longitude >= ? OR longitude <= ?)');
    expect(result.params).toEqual([50, 65, 170, -160]);
  });
});
