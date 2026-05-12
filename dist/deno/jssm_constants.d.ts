/*******
 *
 *  Convenience aliases for common mathematical and numeric constants from
 *  `Number` and `Math`.  Re-exported so that FSL data expressions and tests
 *  can reference them without importing `Math` directly.
 *
 *  Includes: `NegInfinity`, `PosInfinity`, `Epsilon`, `Pi`, `E`, `Root2`,
 *  `RootHalf`, `Ln2`, `Ln10`, `Log2E`, `Log10E`, `MaxSafeInt`, `MinSafeInt`,
 *  `MaxPosNum`, `MinPosNum`, `Phi` (golden ratio), `EulerC` (Euler–Mascheroni).
 *
 */
export declare const NegInfinity: number, PosInfinity: number, Epsilon: number, Pi: number, E: number, Root2: number, RootHalf: number, Ln2: number, Ln10: number, Log2E: number, Log10E: number, MaxSafeInt: number, MinSafeInt: number, MaxPosNum: number, MinPosNum: number, Phi = 1.618033988749895, EulerC = 0.5772156649015329;
/*******
 *
 *  Complete list of node shapes supported by Graphviz.  Used by jssm-viz to
 *  validate and render state shapes in FSL `state ... : { shape: ... }` blocks.
 *
 *  `shapes` is an alias for `gviz_shapes`.
 *
 */
declare const gviz_shapes: string[];
/**
 *  Public alias for {@link gviz_shapes}.  The list of node shapes supported
 *  by Graphviz that jssm-viz accepts in FSL `state ... : { shape: ... }`
 *  declarations.
 */
declare const shapes: string[];
/*******
 *
 *  List of CSS/SVG named colors accepted by jssm-viz for state styling
 *  properties like `background-color` and `text-color`.  Case-insensitive
 *  matching is done at parse time; the canonical casing here follows the
 *  CSS specification.
 *
 */
declare const named_colors: string[];
export { gviz_shapes, shapes, named_colors, };
