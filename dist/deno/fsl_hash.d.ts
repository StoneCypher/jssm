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
/**
 * @param text - FSL source.
 * @returns `"provisional:" + 16 hex digits` (two decorrelated FNV-1a-32 lanes).
 *
 * @example
 *   source_hash('a -> b;'); // e.g. 'provisional:9f1c4e2a3b7d0061'
 */
declare function source_hash(text: string): string;
export { source_hash };
