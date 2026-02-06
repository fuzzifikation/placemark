import { describe, it, expect } from 'vitest';
import { isValidDestination, isSafeOperation } from './validator';

describe('isValidDestination', () => {
  it('accepts normal absolute paths', () => {
    expect(isValidDestination('C:\\Users\\Photos').valid).toBe(true);
    expect(isValidDestination('/home/user/photos').valid).toBe(true);
  });

  it('rejects empty or whitespace-only paths', () => {
    expect(isValidDestination('').valid).toBe(false);
    expect(isValidDestination('   ').valid).toBe(false);
  });

  it('rejects root paths', () => {
    expect(isValidDestination('/').valid).toBe(false);
    expect(isValidDestination('\\').valid).toBe(false);
  });
});

describe('isSafeOperation', () => {
  it('rejects same source and destination', () => {
    expect(isSafeOperation('/photos/img.jpg', '/photos/img.jpg')).toBe(false);
  });

  it('rejects destination inside source directory', () => {
    expect(isSafeOperation('/photos', '/photos/subfolder')).toBe(false);
  });

  it('handles mixed separators (Windows/Unix)', () => {
    expect(isSafeOperation('C:\\Photos\\img.jpg', 'C:/Photos/img.jpg')).toBe(false);
  });

  it('is case-insensitive (Windows paths)', () => {
    expect(isSafeOperation('C:\\Photos\\IMG.jpg', 'c:\\photos\\img.jpg')).toBe(false);
  });

  it('allows valid different paths', () => {
    expect(isSafeOperation('/photos/img.jpg', '/backup/img.jpg')).toBe(true);
  });
});
