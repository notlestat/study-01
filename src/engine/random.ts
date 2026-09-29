export const MAX_SEED = 999999;

export function assertSeed(seed: number): void {
  if (!Number.isInteger(seed) || seed < 0 || seed > MAX_SEED) {
    throw new Error(`Seed must be an integer between 0 and ${MAX_SEED}.`);
  }
}

// A local seeded PRNG. Each engine call starts its own sequence.
export function createRandom(seed: number) {
  assertSeed(seed);
  let state = seed;
  return () => {
    state += 0x6d2b79f5;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function choose<T>(random: () => number, values: readonly T[]): T {
  return values[Math.floor(random() * values.length)];
}
