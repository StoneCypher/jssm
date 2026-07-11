
 

import * as jv   from '../jssm_viz';
import * as jssm from '../jssm';

const sm = jssm.sm;





describe('Dot footer (no footer)', () => {

  test('machine_to_dot without footer omits any extra trailing text', () => {
    const dot = jv.machine_to_dot(sm`a -> b;`);
    // closing brace appears, and no stray identifier is emitted between
    // the last arrange-rank group and `}`
    expect(dot).toMatch(/^digraph G \{/);
    expect(dot).toMatch(/\}\s*$/);
    expect(dot).not.toMatch(/CAPTION_FOOTER/);
  });

  test('machine_to_dot with explicit empty-opts is equivalent to no opts', () => {
    const a = jv.machine_to_dot(sm`a -> b;`);
    const b = jv.machine_to_dot(sm`a -> b;`, {});
    expect(a).toBe(b);
  });

  test('fsl_to_dot without footer omits any extra trailing text', () => {
    const dot = jv.fsl_to_dot('a -> b;');
    expect(dot).not.toMatch(/CAPTION_FOOTER/);
  });

});



describe('Dot footer (footer present)', () => {

  test('machine_to_dot includes footer text verbatim', () => {
    const dot = jv.machine_to_dot(sm`a -> b;`, { footer: 'label="CAPTION_FOOTER";' });
    expect(dot).toMatch(/label="CAPTION_FOOTER";/);
  });

  test('fsl_to_dot includes footer text verbatim', () => {
    const dot = jv.fsl_to_dot('a -> b;', { footer: 'label="CAPTION_FOOTER";' });
    expect(dot).toMatch(/label="CAPTION_FOOTER";/);
  });

  test('footer appears after the closing of arrange/edge content and before final `}`', () => {
    const dot = jv.machine_to_dot(sm`a -> b;`, { footer: 'label="CAPTION_FOOTER";' });
    const footer_idx = dot.indexOf('CAPTION_FOOTER');
    const last_brace = dot.lastIndexOf('}');
    expect(footer_idx).toBeGreaterThan(-1);
    expect(footer_idx).toBeLessThan(last_brace);
  });

});



describe('Dot footer (multiline)', () => {

  test('multiline footer is preserved verbatim', () => {
    const multi = 'labelloc="b";\nlabel="ALPHA_LINE\\nBETA_LINE";';
    const dot   = jv.machine_to_dot(sm`a -> b;`, { footer: multi });
    expect(dot).toMatch(/labelloc="b";/);
    expect(dot).toMatch(/label="ALPHA_LINE\\nBETA_LINE";/);
  });

});



describe('Dot footer composes with preamble', () => {

  test('both preamble (from FSL) and footer (from opts) appear in output', () => {
    const dot = jv.machine_to_dot(
      sm`dot_preamble: "PREAMBLE_TOKEN"; a -> b;`,
      { footer: 'FOOTER_TOKEN' }
    );
    expect(dot).toMatch(/PREAMBLE_TOKEN/);
    expect(dot).toMatch(/FOOTER_TOKEN/);
    // preamble must precede footer in source order
    expect(dot.indexOf('PREAMBLE_TOKEN')).toBeLessThan(dot.indexOf('FOOTER_TOKEN'));
  });

  test('preamble alone (no footer arg) still renders the preamble token', () => {
    const dot = jv.machine_to_dot(sm`dot_preamble: "PREAMBLE_TOKEN"; a -> b;`);
    expect(dot).toMatch(/PREAMBLE_TOKEN/);
    expect(dot).not.toMatch(/FOOTER_TOKEN/);
  });

});
