// Run after building JSSM: node examples/tonal-traffic-light.mjs > traffic-light.svg
import { fsl_to_svg_string } from '../dist/jssm_viz.mjs';

const source = `
machine_name: "Traffic light";
graph_layout: tonal;
flow: down;
arrange [Green Yellow];
Off 'Enable' -> Red;
Red 'Next' => Green 'Next' => Yellow 'Next' => Red;
[Red Yellow Green] 'Disable' ~> Off;
state Red: {background-color: pink; corners: rounded;};
state Green: {background-color: lightgreen; corners: rounded;};
state Yellow: {background-color: lightyellow; corners: rounded;};
state Off: {background-color: steelblue; text-color: white; shape: octagon; linestyle: dashed;};
`;

const svg = await fsl_to_svg_string(source, {
  tonal: {
    id_prefix: 'traffic-light',
    states: {
      Off: { description: 'Signal is disabled.', action: 'Enable', detail: 'starts the cycle at red.', icon: 'traffic-off' },
      Red: { description: 'Traffic must stop.', action: 'Next', detail: 'changes the light to green.', icon: 'traffic-red' },
      Green: { description: 'Traffic may proceed.', action: 'Next', detail: 'changes the light to yellow.', icon: 'traffic-green' },
      Yellow: { description: 'Prepare to stop.', action: 'Next', detail: 'changes the light to red.', icon: 'traffic-yellow' }
    }
  }
});

process.stdout.write(svg);
