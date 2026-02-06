import { describe, it, expect } from 'vitest';
import { buildCombinedQuery } from './combined';

describe('buildCombinedQuery', () => {
  it('builds bounds-only query (delegates to buildBoundsQuery)', () => {
    const result = buildCombinedQuery({
      bounds: { north: 55, south: 35, east: 30, west: -10 },
    });
    expect(result.sql).toContain('latitude BETWEEN ? AND ?');
    expect(result.sql).toContain('longitude BETWEEN ? AND ?');
    expect(result.sql).toContain('latitude IS NOT NULL');
    expect(result.params).toEqual([35, 55, -10, 30]);
  });

  it('builds date-only query (delegates to buildDateRangeQuery)', () => {
    const result = buildCombinedQuery({
      dateRange: { start: 1000, end: 2000 },
    });
    expect(result.sql).toContain('timestamp BETWEEN ? AND ?');
    expect(result.sql).toContain('latitude IS NOT NULL');
    expect(result.params).toEqual([1000, 2000]);
  });

  it('builds combined bounds + date query', () => {
    const result = buildCombinedQuery({
      bounds: { north: 55, south: 35, east: 30, west: -10 },
      dateRange: { start: 1000, end: 2000 },
    });
    expect(result.sql).toContain('latitude BETWEEN ? AND ?');
    expect(result.sql).toContain('longitude BETWEEN ? AND ?');
    expect(result.sql).toContain('timestamp BETWEEN ? AND ?');
    expect(result.params).toEqual([35, 55, -10, 30, 1000, 2000]);
  });

  it('always includes NOT NULL clauses even with empty filter', () => {
    const result = buildCombinedQuery({});
    expect(result.sql).toBe('latitude IS NOT NULL AND longitude IS NOT NULL');
    expect(result.params).toEqual([]);
  });
});
