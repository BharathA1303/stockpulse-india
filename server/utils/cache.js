/**
 * Simple in-memory cache with TTL.
 * Keys expire after `ttl` milliseconds (default 60 s).
 */

export default class Cache {
  constructor(ttl = 60_000) {
    /** @type {Map<string, { data: any, expiresAt: number }>} */
    this.store = new Map();
    this.ttl = ttl;
  }

  /** Return cached value or `undefined` if expired / missing. */
  get(key) {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.data;
  }

  set(key, data) {
    this.store.set(key, { data, expiresAt: Date.now() + this.ttl });
  }
}
