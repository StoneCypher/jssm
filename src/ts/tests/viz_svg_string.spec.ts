
 

import * as jv   from '../jssm_viz';
import * as jssm from '../jssm';

const sm = jssm.sm;




describe('SVG string rendering', () => {

  test('fsl_to_svg_string resolves with SVG content', async () => {
    const svg = await jv.fsl_to_svg_string('a -> b;');
    expect(svg).toMatch(/<\?xml|<svg/);
  });

  test('fsl_to_svg_string accepts a {engine} option', async () => {
    const svg = await jv.fsl_to_svg_string('a -> b;', { engine: 'dot' });
    expect(svg).toMatch(/<\?xml|<svg/);
  });

  test('machine_to_svg_string resolves with SVG content', async () => {
    const svg = await jv.machine_to_svg_string(sm`a -> b;`);
    expect(svg).toMatch(/<\?xml|<svg/);
  });

  test('dot_to_svg accepts a raw dot string', async () => {
    const svg = await jv.dot_to_svg('digraph G { a -> b; }');
    expect(svg).toMatch(/<\?xml|<svg/);
  });

  test('dot_to_svg accepts a {engine} option', async () => {
    const svg = await jv.dot_to_svg('digraph G { a -> b; }', { engine: 'dot' });
    expect(svg).toMatch(/<\?xml|<svg/);
  });

});
