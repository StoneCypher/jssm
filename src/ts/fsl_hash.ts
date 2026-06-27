/**
 * Provisional content hash of FSL source — the binding between a tape and its
 * machine (M3, brainstorm Q4). Deterministic, synchronous, dependency-free
 * (two-lane FNV-1a 32-bit via `Math.imul`, no BigInt so it down-levels below
 * ES2020), tagged `provisional:`.
 *
 * THE M1 SEAM: M1 replaces this single function with the canonical pinned
 * SHA-256 over normalized source (and a `sha256:` tag). M3 makes no security
 * claim — this only answers "does this tape's machine match the doc given".
 */

const FNV_PRIME_32 = 0x01000193;

// One 32-bit FNV-1a lane (kept inside uint32 via `>>> 0` and `Math.imul`).
function fnv32(text: string, seed: number): number {
  let h = seed >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, FNV_PRIME_32) >>> 0;
  }
  return h >>> 0;
}

/**
 * @param text - FSL source.
 * @returns `"provisional:" + 16 hex digits` (two decorrelated FNV-1a-32 lanes).
 *
 * @example
 *   source_hash('a -> b;'); // e.g. 'provisional:9f1c4e2a3b7d0061'
 */
function source_hash(text: string): string {
  const a = fnv32(text, 0x811c9dc5);   // standard FNV offset basis
  const b = fnv32(text, 0x9e3779b1);   // golden-ratio seed, to decorrelate the lanes
  return 'provisional:' + a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0');
}

export { source_hash };
