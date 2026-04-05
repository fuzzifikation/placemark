/**
 * Concurrency utility for import pipelines.
 *
 * Uses a proper semaphore pool (not batch chunking) so fast tasks don't wait
 * for the slowest item in a batch.
 */

/** Number of concurrent async tasks for both local EXIF reads and OneDrive subfolder walks. */
export const IMPORT_CONCURRENCY = 8;

/**
 * Run `fn` over every item in `items` with at most `limit` tasks in-flight simultaneously.
 *
 * @param items   The items to process.
 * @param limit   Maximum number of concurrent executions.
 * @param fn      Async function to run per item. Should not throw — catch internally if needed.
 */
export async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>
): Promise<void> {
  const iter = items[Symbol.iterator]();
  let active = 0;
  let done = false;
  let rejected = false;

  return new Promise<void>((resolve, reject) => {
    function next(): void {
      while (active < limit && !done && !rejected) {
        const { value, done: iterDone } = iter.next();
        if (iterDone) {
          done = true;
          if (active === 0) resolve();
          return;
        }
        active++;
        fn(value as T).then(
          () => {
            active--;
            if (rejected) return;
            next();
            if (done && active === 0) resolve();
          },
          (err) => {
            if (!rejected) {
              rejected = true;
              reject(err);
            }
          }
        );
      }
    }

    next();
  });
}
