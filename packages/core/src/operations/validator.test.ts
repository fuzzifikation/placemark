import { describe, it, expect } from 'vitest';
import { isValidDestination } from './validator';

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
