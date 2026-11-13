// Run after building JSSM: node examples/tonal-traffic-light.mjs > traffic-light.svg
import { fsl_to_svg_string } from '../dist/jssm_viz.mjs';

// HPLuv pastels: P=100, L=90; hues Red=10, Green=135, Yellow=75.
// Generated with hsluv@1.0.2; no runtime color-conversion dependency.
// Off uses HPLuv(250, 45, 45). See tonal-rendering.md for palette rationale.
const source = `
machine_name: "Traffic light";
graph_renderer: tonal;
flow: down;
arrange [Green Yellow];
Off 'Enable' -> Red;
Red 'Next' => Green 'Next' => Yellow 'Next' => Red;
[Red Yellow Green] 'Disable' ~> Off;
state Red: {background-color: #fedadb; corners: rounded;};
state Green: {background-color: #cbead1; corners: rounded;};
state Yellow: {background-color: #eae3c7; corners: rounded;};
state Off: {background-color: #626b7c; text-color: white; corners: rounded; linestyle: dashed;};
`;

const svg = await fsl_to_svg_string(source, {
  tonal: {
    id_prefix: 'traffic-light',
    states: {
      Off: {
        description: 'Signal is disabled.', action: 'Enable', detail: 'starts the cycle at red.',
        icon: { nodes: [
          ['path', { d: 'M7 5a9 9 0 1 0 10 0' }],
          ['line', { x1: 12, y1: 2, x2: 12, y2: 12 }]
        ] }
      },
      Red: { description: 'Traffic must stop.', action: 'Next', detail: 'changes the light to green.', icon: 'traffic-red' },
      Green: { description: 'Traffic may proceed.', action: 'Next', detail: 'changes the light to yellow.', icon: 'traffic-green' },
      Yellow: { description: 'Prepare to stop.', action: 'Next', detail: 'changes the light to red.', icon: 'traffic-yellow' }
    }
  }
});

process.stdout.write(svg);
