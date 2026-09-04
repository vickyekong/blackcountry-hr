const g = globalThis as unknown as {
  __ensureOnceDone?: Set<string>;
  __ensureOnceInflight?: Map<string, Promise<void>>;
};

const done = (g.__ensureOnceDone ??= new Set<string>());
const inflight = (g.__ensureOnceInflight ??= new Map<string, Promise<void>>());

/**
 * One DDL pass per process. Concurrent cold-start requests share the same
 * promise instead of each taking AccessExclusiveLock on the same tables.
 */
export function runEnsureOnce(key: string, fn: () => Promise<void>): Promise<void> {
  if (done.has(key)) return Promise.resolve();
  let pending = inflight.get(key);
  if (!pending) {
    pending = fn()
      .then(() => {
        done.add(key);
      })
      .finally(() => {
        inflight.delete(key);
      });
    inflight.set(key, pending);
  }
  return pending;
}
