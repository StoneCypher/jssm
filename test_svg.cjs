const { sm } = require('./dist/jssm.es5.cjs');
const { machine_to_svg_string } = require('./dist/jssm_viz.cjs');

async function test() {
  const machine = sm`a -> b -> c;`;
  const svg = await machine_to_svg_string(machine);
  console.log(svg.split('<g id="edge').slice(1,2)[0].substring(0, 500));
}
test();
