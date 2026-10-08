/** Small seeded PRNG (mulberry32) so synthesis variation is reproducible in tests. */
export type Random = () => number;

export function seededRandom(seed: number): Random {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Uniform value in [center·(1−spread), center·(1+spread)]. */
export function jitter(random: Random, center: number, spread: number): number {
  return center * (1 + (random() * 2 - 1) * spread);
}
