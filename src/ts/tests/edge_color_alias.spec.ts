
/* eslint-disable max-len */

/**
 * Regression suite for StoneCypher/fsl#358 -- `edge_color` shouldn't be
 * underscore when its sibling arrow/state colour keywords (`text-color`,
 * `background-color`, `border-color`, `line-style`) are all dashed.
 *
 * The grammar now accepts both `edge-color` (new, consistent with peers)
 * and `edge_color` (legacy, for backward compatibility).  Both spellings
 * must produce the SAME parse-AST node so downstream consumers behave
 * identically.
 */

import * as jssm from '../jssm';
import { sm }    from '../jssm';





describe('StoneCypher/fsl#358 - edge-color / edge_color aliases', () => {

  describe('per-edge override inside ArrowDesc (SingleEdgeColor)', () => {

    /**
     * Both `{edge_color:red;}` and `{edge-color:red;}` must produce an
     * AST node whose key is `single_edge_color`, regardless of which
     * surface spelling appeared in the source.
     */
    test('underscore form parses and emits key "single_edge_color"', () => {
      const ast = jssm.parse('a -> {edge_color: red;} b;');
      expect(JSON.stringify(ast)).toContain('single_edge_color');
    });

    test('dashed form parses and emits key "single_edge_color"', () => {
      const ast = jssm.parse('a -> {edge-color: red;} b;');
      expect(JSON.stringify(ast)).toContain('single_edge_color');
    });

    test('underscore and dashed forms produce identical ASTs', () => {
      const under = jssm.parse('a -> {edge_color: red;} b;');
      const dash  = jssm.parse('a -> {edge-color: red;} b;');
      expect(dash).toEqual(under);
    });

    test('both forms compile into a valid machine (sm tagged literal)', () => {
      expect(() => { const _u = sm`a -> {edge_color: red;} b;`; }).not.toThrow();
      expect(() => { const _d = sm`a -> {edge-color: red;} b;`; }).not.toThrow();
    });

  });


  describe('graph-wide default inside `transition:` config (GraphDefaultEdgeColor)', () => {

    /**
     * The `transition: { edge_color: ...; };` and `transition: { edge-color: ...; };`
     * config statements must both PARSE, and both must produce the SAME
     * AST so any future compiler support handles them identically.
     *
     * NOTE: the `transition: { ... };` statement is accepted by the
     * grammar but is not currently wired into `compile_rule_handler`
     * (it throws `Unknown rule: {"config_kind":"transition", ...}`).
     * That's a pre-existing bug independent of fsl#358 — these tests
     * only exercise the parser, which is the surface area the issue
     * is actually about.
     */
    test('underscore form parses and emits key "graph_default_edge_color"', () => {
      const ast = jssm.parse('transition: { edge_color: blue; }; a -> b;');
      expect(JSON.stringify(ast)).toContain('graph_default_edge_color');
    });

    test('dashed form parses and emits key "graph_default_edge_color"', () => {
      const ast = jssm.parse('transition: { edge-color: blue; }; a -> b;');
      expect(JSON.stringify(ast)).toContain('graph_default_edge_color');
    });

    test('underscore and dashed config forms produce identical ASTs', () => {
      const under = jssm.parse('transition: { edge_color: blue; }; a -> b;');
      const dash  = jssm.parse('transition: { edge-color: blue; }; a -> b;');
      expect(dash).toEqual(under);
    });

  });

});
