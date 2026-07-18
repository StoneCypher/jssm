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
 * @param svg - SVG markup from the viz pipeline (`machine_to_svg_string`, etc.).
 * @returns The reordered SVG markup; identical input for non-graphviz SVG.
 * @example
 * // <g class="graph"><polygon/>…<g class="node"/><g class="edge"><path/><text/></g></g>
 * // becomes: <g class="graph"><polygon/><g class="edge"><path/></g><g class="node"/><text/></g>
 */
export function reorder_svg_layers(svg) {
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    const graph = doc.querySelector('g.graph');
    if (graph === null) {
        return svg;
    }
    const background = graph.querySelector(':scope > polygon');
    const edges = [...graph.querySelectorAll(':scope > g.edge')];
    const nodes = [...graph.querySelectorAll(':scope > g.node')];
    // Hoist every edge's label out of its group so it lands on the top layer.
    const labels = [];
    for (const edge of edges) {
        for (const text of edge.querySelectorAll(':scope > text')) {
            labels.push(text);
        }
    }
    // appendChild moves a node to the end (top of the stack), so appending in
    // back-to-front order yields: background, edges, nodes, labels.
    if (background !== null) {
        graph.append(background);
    }
    for (const edge of edges) {
        graph.append(edge);
    }
    for (const node of nodes) {
        graph.append(node);
    }
    for (const label of labels) {
        graph.append(label);
    }
    return new XMLSerializer().serializeToString(doc);
}
