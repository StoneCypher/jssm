/**
 * Reorder a graphviz-rendered SVG's paint stack so action labels can't be
 * painted over by edges. Graphviz interleaves nodes and edges and keeps each
 * edge's label `<text>` inside the edge group, so a later edge can draw over an
 * earlier edge's label. This lifts the layers into a clean back-to-front order:
 *
 *   background → edges → nodes → action (edge) labels
 *
 * Each edge's label text is hoisted out of its edge group to the very top.
 * Markup that isn't graphviz output (no `g.graph`) is returned untouched.
 *
 * @param svg - SVG markup from the viz pipeline (`machine_to_svg_string`, etc.).
 * @returns The reordered SVG markup; identical input for non-graphviz SVG.
 *
 * @example
 * // <g class="graph"><polygon/>…<g class="node"/><g class="edge"><path/><text/></g></g>
 * // becomes: <g class="graph"><polygon/><g class="edge"><path/></g><g class="node"/><text/></g>
 */
export declare function reorder_svg_layers(svg: string): string;
