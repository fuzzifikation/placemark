/**
 * Unit tests for format helpers
 *
 * Note: Desktop package doesn't currently have test infrastructure.
 * These tests are written in vitest format for when test infrastructure is added.
 *
 * To run these tests:
 * 1. Install vitest in desktop package: pnpm add -D vitest
 * 2. Add test script to package.json: "test": "vitest"
 * 3. Run: pnpm test
 *
 * Alternatively, copy this file to packages/core/src/ to run with existing core tests.
 */

// Uncomment when vitest is available:
// import { describe, it, expect } from 'vitest';
// import { isSupportedImageFile, isRawFile } from './formats';

/*
describe('isSupportedImageFile', () => {
  it('returns true for standard image formats', () => {
    expect(isSupportedImageFile('photo.jpg')).toBe(true);
    expect(isSupportedImageFile('photo.jpeg')).toBe(true);
    expect(isSupportedImageFile('photo.png')).toBe(true);
    expect(isSupportedImageFile('photo.heic')).toBe(true);
    expect(isSupportedImageFile('photo.heif')).toBe(true);
    expect(isSupportedImageFile('photo.tiff')).toBe(true);
    expect(isSupportedImageFile('photo.tif')).toBe(true);
    expect(isSupportedImageFile('photo.webp')).toBe(true);
  });

  it('returns true for RAW formats (Canon)', () => {
    expect(isSupportedImageFile('photo.cr2')).toBe(true);
    expect(isSupportedImageFile('photo.cr3')).toBe(true);
  });

  it('returns true for RAW formats (Nikon)', () => {
    expect(isSupportedImageFile('photo.nef')).toBe(true);
    expect(isSupportedImageFile('photo.nrw')).toBe(true);
  });

  it('returns true for RAW formats (Sony)', () => {
    expect(isSupportedImageFile('photo.arw')).toBe(true);
  });

  it('returns true for RAW formats (DNG)', () => {
    expect(isSupportedImageFile('photo.dng')).toBe(true);
  });

  it('returns true for RAW formats (other brands)', () => {
    expect(isSupportedImageFile('photo.raf')).toBe(true); // Fujifilm
    expect(isSupportedImageFile('photo.orf')).toBe(true); // Olympus
    expect(isSupportedImageFile('photo.rw2')).toBe(true); // Panasonic
    expect(isSupportedImageFile('photo.pef')).toBe(true); // Pentax
    expect(isSupportedImageFile('photo.srw')).toBe(true); // Samsung
    expect(isSupportedImageFile('photo.rwl')).toBe(true); // Leica
  });

  it('is case-insensitive', () => {
    expect(isSupportedImageFile('photo.JPG')).toBe(true);
    expect(isSupportedImageFile('photo.JPEG')).toBe(true);
    expect(isSupportedImageFile('photo.CR2')).toBe(true);
    expect(isSupportedImageFile('photo.NEF')).toBe(true);
    expect(isSupportedImageFile('photo.ArW')).toBe(true);
  });

  it('returns true for files with full paths', () => {
    expect(isSupportedImageFile('/photos/vacation/IMG_1234.jpg')).toBe(true);
    expect(isSupportedImageFile('C:\\Photos\\DSC_5678.nef')).toBe(true);
    expect(isSupportedImageFile('/mnt/photos/canon/IMG_9999.cr2')).toBe(true);
  });

  it('returns false for unsupported formats', () => {
    expect(isSupportedImageFile('document.pdf')).toBe(false);
    expect(isSupportedImageFile('video.mp4')).toBe(false);
    expect(isSupportedImageFile('audio.mp3')).toBe(false);
    expect(isSupportedImageFile('file.txt')).toBe(false);
    expect(isSupportedImageFile('file.raw')).toBe(false); // .raw is not a real format
  });

  it('returns false for files without extensions', () => {
    expect(isSupportedImageFile('photo')).toBe(false);
    expect(isSupportedImageFile('/path/to/file')).toBe(false);
  });
});

describe('isRawFile', () => {
  it('returns true for Canon RAW formats', () => {
    expect(isRawFile('photo.cr2')).toBe(true);
    expect(isRawFile('photo.cr3')).toBe(true);
  });

  it('returns true for Nikon RAW formats', () => {
    expect(isRawFile('photo.nef')).toBe(true);
    expect(isRawFile('photo.nrw')).toBe(true);
  });

  it('returns true for Sony RAW format', () => {
    expect(isRawFile('photo.arw')).toBe(true);
  });

  it('returns true for DNG format', () => {
    expect(isRawFile('photo.dng')).toBe(true);
  });

  it('returns true for other RAW formats', () => {
    expect(isRawFile('photo.raf')).toBe(true); // Fujifilm
    expect(isRawFile('photo.orf')).toBe(true); // Olympus
    expect(isRawFile('photo.rw2')).toBe(true); // Panasonic
    expect(isRawFile('photo.pef')).toBe(true); // Pentax
    expect(isRawFile('photo.srw')).toBe(true); // Samsung
    expect(isRawFile('photo.rwl')).toBe(true); // Leica
  });

  it('is case-insensitive', () => {
    expect(isRawFile('photo.CR2')).toBe(true);
    expect(isRawFile('photo.NEF')).toBe(true);
    expect(isRawFile('photo.ArW')).toBe(true);
  });

  it('returns false for standard image formats', () => {
    expect(isRawFile('photo.jpg')).toBe(false);
    expect(isRawFile('photo.jpeg')).toBe(false);
    expect(isRawFile('photo.png')).toBe(false);
    expect(isRawFile('photo.heic')).toBe(false);
    expect(isRawFile('photo.tiff')).toBe(false);
    expect(isRawFile('photo.webp')).toBe(false);
  });

  it('returns false for unsupported formats', () => {
    expect(isRawFile('document.pdf')).toBe(false);
    expect(isRawFile('video.mp4')).toBe(false);
    expect(isRawFile('file.txt')).toBe(false);
  });

  it('returns false for files without extensions', () => {
    expect(isRawFile('photo')).toBe(false);
    expect(isRawFile('/path/to/file')).toBe(false);
  });
});
*/
