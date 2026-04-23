import { describe, it, expect } from 'vitest';
import { isValidDestination, isForbiddenDestination, normalizePath, isSamePath } from './validator';

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

describe('isForbiddenDestination', () => {
  const forbidden = ['C:\\Windows', '/System', '/Users/me/AppData/Roaming/placemark'];

  it('matches an exact forbidden path', () => {
    expect(isForbiddenDestination('C:\\Windows', forbidden)).toBe(true);
    expect(isForbiddenDestination('/System', forbidden)).toBe(true);
  });

  it('matches paths inside a forbidden prefix', () => {
    expect(isForbiddenDestination('C:\\Windows\\System32', forbidden)).toBe(true);
    expect(isForbiddenDestination('/System/Library/Frameworks', forbidden)).toBe(true);
  });

  it('is case-insensitive (Windows/macOS semantics)', () => {
    expect(isForbiddenDestination('c:/windows/system32', forbidden)).toBe(true);
    expect(isForbiddenDestination('/system/foo', forbidden)).toBe(true);
  });

  it('handles mixed separators', () => {
    expect(isForbiddenDestination('C:/Windows/system32', forbidden)).toBe(true);
  });

  it('rejects sibling paths with shared prefix (no false partial match)', () => {
    // "/System2" should NOT match "/System"
    expect(isForbiddenDestination('/System2', forbidden)).toBe(false);
    expect(isForbiddenDestination('C:\\WindowsApps', forbidden)).toBe(false);
  });

  it('does not match unrelated paths', () => {
    expect(isForbiddenDestination('D:\\Photos\\Vacation', forbidden)).toBe(false);
    expect(isForbiddenDestination('/home/user/photos', forbidden)).toBe(false);
  });

  it('ignores empty forbidden entries', () => {
    expect(isForbiddenDestination('C:\\Windows', ['', 'C:\\Windows'])).toBe(true);
    expect(isForbiddenDestination('C:\\Users', [''])).toBe(false);
  });

  it('handles trailing slashes in prefixes', () => {
    expect(isForbiddenDestination('/System/Library', ['/System/'])).toBe(true);
  });
});

describe('normalizePath', () => {
  it('unifies separators to forward slash', () => {
    expect(normalizePath('C:\\Users\\Photos')).toBe('c:/users/photos');
  });

  it('collapses repeated slashes', () => {
    expect(normalizePath('/home//user///photos')).toBe('/home/user/photos');
    expect(normalizePath('C:\\\\Users\\\\Photos')).toBe('c:/users/photos');
  });

  it('strips trailing slash but preserves bare root', () => {
    expect(normalizePath('/home/user/')).toBe('/home/user');
    expect(normalizePath('/')).toBe('/');
  });

  it('lowercases the path', () => {
    expect(normalizePath('/Users/ME/Photos')).toBe('/users/me/photos');
  });
});

describe('isSamePath', () => {
  it('treats forward and backslash paths as equal', () => {
    expect(isSamePath('C:\\Users\\Photos\\a.jpg', 'C:/Users/Photos/a.jpg')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isSamePath('/home/user/a.jpg', '/HOME/User/A.jpg')).toBe(true);
  });

  it('ignores trailing slash differences', () => {
    expect(isSamePath('/home/user', '/home/user/')).toBe(true);
  });

  it('ignores repeated slashes', () => {
    expect(isSamePath('/home//user/a.jpg', '/home/user/a.jpg')).toBe(true);
  });

  it('distinguishes different paths', () => {
    expect(isSamePath('/home/user/a.jpg', '/home/user/b.jpg')).toBe(false);
    expect(isSamePath('C:\\Users\\A', 'C:\\Users\\B')).toBe(false);
  });

  it('distinguishes sibling paths with shared prefix', () => {
    expect(isSamePath('/System', '/System2')).toBe(false);
  });
});
