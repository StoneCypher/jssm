
 

import * as jv   from '../jssm_viz';
import * as jssm from '../jssm';

const sm = jssm.sm;




describe('hide_state_labels option (StoneCypher/fsl#427)', () => {

  describe('machine_to_dot', () => {

    test('default render emits state-name labels', () => {
      const dot = jv.machine_to_dot(sm`alpha -> beta;`);
      expect(dot).toMatch(/label="alpha"/);
      expect(dot).toMatch(/label="beta"/);
    });

    test('hide_state_labels: true suppresses state-name labels', () => {
      const dot = jv.machine_to_dot(sm`alpha -> beta;`, { hide_state_labels: true });
      expect(dot).not.toMatch(/label="alpha"/);
      expect(dot).not.toMatch(/label="beta"/);
    });

    test('hide_state_labels: true still emits node identifiers', () => {
      const dot = jv.machine_to_dot(sm`alpha -> beta;`, { hide_state_labels: true });
      // PR #594 replaced n0/n1 index IDs with state-name-derived slugs.
      expect(dot).toMatch(/\balpha\b/);
      expect(dot).toMatch(/\bbeta\b/);
    });

    test('hide_state_labels: false renders identically to default', () => {
      const a = jv.machine_to_dot(sm`alpha -> beta;`);
      const b = jv.machine_to_dot(sm`alpha -> beta;`, { hide_state_labels: false });
      expect(a).toBe(b);
    });

    test('hide_state_labels: true preserves edge structure', () => {
      const dot = jv.machine_to_dot(sm`alpha -> beta;`, { hide_state_labels: true });
      expect(dot).toMatch(/"alpha"\s*->\s*"beta"/);
    });

    test('hide_state_labels: true preserves shape attribute', () => {
      const dot = jv.machine_to_dot(sm`state c: { shape: circle; }; a -> c;`, { hide_state_labels: true });
      expect(dot).toMatch(/shape="circle"/);
      expect(dot).not.toMatch(/label="c"/);
    });

    test('hide_state_labels: true preserves border color', () => {
      const dot = jv.machine_to_dot(sm`state c: { border-color: #FF0000FF; }; a -> c;`, { hide_state_labels: true });
      expect(dot).toMatch(/color="#FF0000FF"/);
      expect(dot).not.toMatch(/label="c"/);
    });

    test('omitting opts is equivalent to {}', () => {
      const a = jv.machine_to_dot(sm`a -> b;`);
      const b = jv.machine_to_dot(sm`a -> b;`, {});
      expect(a).toBe(b);
    });

  });



  describe('fsl_to_dot', () => {

    test('default render emits state-name labels', () => {
      const dot = jv.fsl_to_dot('alpha -> beta;');
      expect(dot).toMatch(/label="alpha"/);
      expect(dot).toMatch(/label="beta"/);
    });

    test('hide_state_labels: true suppresses state-name labels', () => {
      const dot = jv.fsl_to_dot('alpha -> beta;', { hide_state_labels: true });
      expect(dot).not.toMatch(/label="alpha"/);
      expect(dot).not.toMatch(/label="beta"/);
    });

    test('fsl_to_dot composes with hide_state_labels equivalently to machine_to_dot', () => {
      const a = jv.machine_to_dot(sm`alpha -> beta;`, { hide_state_labels: true });
      const b = jv.fsl_to_dot('alpha -> beta;',        { hide_state_labels: true });
      expect(a).toBe(b);
    });

  });



  describe('composition with other render features', () => {

    test('hide_state_labels respects dot_preamble', () => {
      const dot = jv.machine_to_dot(sm`dot_preamble: "// hello"; a -> b;`, { hide_state_labels: true });
      expect(dot).toMatch(/\/\/ hello/);
      expect(dot).not.toMatch(/label="a"/);
      expect(dot).not.toMatch(/label="b"/);
    });

    test('hide_state_labels respects flow direction', () => {
      const dot = jv.machine_to_dot(sm`flow: right; a -> b;`, { hide_state_labels: true });
      expect(dot).toMatch(/rankdir=LR/);
      expect(dot).not.toMatch(/label="a"/);
    });

    test('hide_state_labels respects arrange declarations', () => {
      const dot = jv.machine_to_dot(sm`a -> b; arrange [a b];`, { hide_state_labels: true });
      expect(dot).toMatch(/rank=same/);
      expect(dot).not.toMatch(/label="a"/);
    });

  });

});
