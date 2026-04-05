import { describe, it, expect } from 'vitest';
import { isPhotoInDateRange, getDateRange } from './temporal';
import type { Photo } from '../models/Photo';

function photo(id: number, timestamp: number | null): Photo {
  return {
    id,
    source: 'local',
    path: `/test${id}.jpg`,
    latitude: null,
    longitude: null,
    timestamp,
    fileHash: null,
    scannedAt: Date.now(),
    fileSize: 1000,
    mimeType: 'image/jpeg',
    cameraMake: null,
    cameraModel: null,
    cloudItemId: null,
    cloudFolderPath: null,
    cloudSha256: null,
    cloudWebUrl: null,
    cloudFolderWebUrl: null,
  };
}

describe('isPhotoInDateRange', () => {
  const range = { start: 1000, end: 2000 };

  it('includes photo within range', () => {
    expect(isPhotoInDateRange(photo(1, 1500), range)).toBe(true);
  });

  it('includes photo at exact start boundary', () => {
    expect(isPhotoInDateRange(photo(1, 1000), range)).toBe(true);
  });

  it('includes photo at exact end boundary', () => {
    expect(isPhotoInDateRange(photo(1, 2000), range)).toBe(true);
  });

  it('excludes photo before range', () => {
    expect(isPhotoInDateRange(photo(1, 999), range)).toBe(false);
  });

  it('excludes photo after range', () => {
    expect(isPhotoInDateRange(photo(1, 2001), range)).toBe(false);
  });

  it('excludes photo with null timestamp', () => {
    expect(isPhotoInDateRange(photo(1, null), range)).toBe(false);
  });
});

describe('getDateRange', () => {
  it('returns null for empty array', () => {
    expect(getDateRange([])).toBeNull();
  });

  it('returns null when all timestamps are null', () => {
    expect(getDateRange([photo(1, null), photo(2, null)])).toBeNull();
  });

  it('returns equal start/end for single photo', () => {
    const result = getDateRange([photo(1, 5000)]);
    expect(result).toEqual({ start: 5000, end: 5000 });
  });

  it('returns min and max across multiple photos', () => {
    const result = getDateRange([photo(1, 3000), photo(2, 1000), photo(3, 5000)]);
    expect(result).toEqual({ start: 1000, end: 5000 });
  });

  it('ignores photos with null timestamps', () => {
    const result = getDateRange([photo(1, null), photo(2, 2000), photo(3, null), photo(4, 4000)]);
    expect(result).toEqual({ start: 2000, end: 4000 });
  });

  it('handles negative timestamps', () => {
    const result = getDateRange([photo(1, -1000), photo(2, 500)]);
    expect(result).toEqual({ start: -1000, end: 500 });
  });
});
