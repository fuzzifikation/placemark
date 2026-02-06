import { describe, it, expect } from 'vitest';
import { generateOperationPlan } from './planner';
import type { Photo } from '../models/Photo';

/** Helper to create a minimal Photo */
function photo(id: number, filePath: string, fileSize = 1000): Photo {
  return {
    id,
    source: 'local',
    path: filePath,
    latitude: 48.8,
    longitude: 2.3,
    timestamp: Date.now(),
    fileHash: null,
    scannedAt: Date.now(),
    fileSize,
    mimeType: 'image/jpeg',
  };
}

describe('generateOperationPlan', () => {
  it('maps photos to destination paths (Unix)', () => {
    const plan = generateOperationPlan([photo(1, '/photos/vacation/IMG_001.jpg')], '/dest', 'copy');
    expect(plan.operations).toHaveLength(1);
    expect(plan.operations[0].destPath).toBe('/dest/IMG_001.jpg');
    expect(plan.operations[0].status).toBe('pending');
  });

  it('maps photos to destination paths (Windows)', () => {
    const plan = generateOperationPlan([photo(1, 'C:\\Photos\\IMG_001.jpg')], 'D:\\Backup', 'move');
    expect(plan.operations[0].destPath).toBe('D:\\Backup\\IMG_001.jpg');
  });

  it('resolves batch filename collisions with (1), (2) suffixes', () => {
    const photos = [
      photo(1, '/folder-a/IMG_001.jpg'),
      photo(2, '/folder-b/IMG_001.jpg'),
      photo(3, '/folder-c/IMG_001.jpg'),
    ];
    const plan = generateOperationPlan(photos, '/dest', 'copy');

    expect(plan.operations[0].destPath).toBe('/dest/IMG_001.jpg');
    expect(plan.operations[1].destPath).toBe('/dest/IMG_001 (1).jpg');
    expect(plan.operations[2].destPath).toBe('/dest/IMG_001 (2).jpg');
  });

  it('handles files without extension', () => {
    const photos = [photo(1, '/a/README'), photo(2, '/b/README')];
    const plan = generateOperationPlan(photos, '/dest', 'copy');

    expect(plan.operations[0].destPath).toBe('/dest/README');
    expect(plan.operations[1].destPath).toBe('/dest/README (1)');
  });

  it('strips trailing separator from dest folder', () => {
    const plan = generateOperationPlan([photo(1, '/photos/test.jpg')], '/dest/', 'copy');
    expect(plan.operations[0].destPath).toBe('/dest/test.jpg');
  });

  it('returns empty plan for empty input', () => {
    const plan = generateOperationPlan([], '/dest', 'copy');
    expect(plan.operations).toHaveLength(0);
    expect(plan.summary.totalFiles).toBe(0);
    expect(plan.summary.totalSize).toBe(0);
  });

  it('sums totalSize correctly', () => {
    const photos = [
      photo(1, '/a/a.jpg', 500),
      photo(2, '/b/b.jpg', 1500),
      photo(3, '/c/c.jpg', 3000),
    ];
    const plan = generateOperationPlan(photos, '/dest', 'copy');
    expect(plan.summary.totalSize).toBe(5000);
    expect(plan.summary.totalFiles).toBe(3);
  });
});
