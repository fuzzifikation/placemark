/**
 * LRU Cache for managing object URLs to prevent memory leaks
 */
export class ThumbnailCache {
  private cache = new Map<number, string>();
  private readonly maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  get(id: number): string | undefined {
    const item = this.cache.get(id);
    if (item) {
      // Refresh LRU order: delete and re-add to end
      this.cache.delete(id);
      this.cache.set(id, item);
    }
    return item;
  }

  set(id: number, url: string): void {
    if (this.cache.has(id)) {
      this.cache.delete(id); // Update position
    } else if (this.cache.size >= this.maxSize) {
      // Evict oldest (first item in Map)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        const oldUrl = this.cache.get(firstKey);
        if (oldUrl) URL.revokeObjectURL(oldUrl);
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(id, url);
  }

  clear(): void {
    for (const url of this.cache.values()) {
      URL.revokeObjectURL(url);
    }
    this.cache.clear();
  }
}
