import { from, JssmError } from '../jssm';
import {
  fsl_to_svg_string, machine_to_svg_string,
  graphviz_provider, tonal_provider,
  register_renderer, unregister_renderer, renderer_names, renderer_for
} from '../jssm_viz';
import { select_renderer } from '../jssm_viz_registry';
import type { VizRenderProvider } from '../jssm_viz';

// The renderer registry behind FSL's `graph_renderer` and the `provider`
// render option.  Registry tests use literal provider objects and check the
// registry's own observable state; the render tests drive real FSL through
// real Graphviz and compare against independently produced output, so no
// expectation is built from the code under test.

/** Names this file may register; every test starts and ends without them. */
const TEST_NAMES = ['cards', 'cards-2', 'framed', 'my cards', 'passthrough', 'stamp'];

afterEach(() => {
  for (const name of TEST_NAMES) { unregister_renderer(name); }
});

/** A renderer whose output says which renderer drew it and what it saw. */
function stamp(name: string): VizRenderProvider {
  return { name, render: context => `<svg data-by="${name}" data-renderer="${String(context.machine.graph_renderer())}"></svg>` };
}

/** A renderer that draws exactly like the built-in Graphviz one, through the same context services. */
const passthrough: VizRenderProvider = {
  name   : 'passthrough',
  render : context => context.render_dot(context.to_dot(), 'svg')
};

/** Runs `fn` and returns what it threw, so a test can inspect the error itself. */
function thrown(fn: () => unknown): unknown {
  try { fn(); } catch (error: unknown) { return error; }
  throw new Error('expected the call to throw');
}



describe('the built-in renderers', () => {

  it('starts with graphviz then tonal', () => {
    expect(renderer_names()).toEqual(['graphviz', 'tonal']);
  });

  it('looks the built-ins up by name', () => {
    expect(renderer_for('graphviz')).toBe(graphviz_provider);
    expect(renderer_for('tonal')).toBe(tonal_provider);
  });

  it('looks names up exactly, so a different case or an unknown name finds nothing', () => {
    expect(renderer_for('Tonal')).toBeUndefined();
    expect(renderer_for('nope')).toBeUndefined();
  });

  it.each(['graphviz', 'tonal'])('refuses to replace the built-in %s, even with replace', name => {
    const impostor = stamp(name);
    expect(() => { register_renderer(impostor); }).toThrow(JssmError);
    expect(() => { register_renderer(impostor, { replace: true }); }).toThrow(/built-in/);
    expect(renderer_for(name)).not.toBe(impostor);
  });

  it.each(['graphviz', 'tonal'])('refuses to unregister the built-in %s', name => {
    expect(() => unregister_renderer(name)).toThrow(JssmError);
    expect(renderer_names()).toContain(name);
  });

});



describe('registering application renderers', () => {

  it('adds a renderer after the built-ins and finds it by name', () => {
    const cards = stamp('cards');
    register_renderer(cards);
    expect(renderer_names()).toEqual(['graphviz', 'tonal', 'cards']);
    expect(renderer_for('cards')).toBe(cards);
  });

  it('keeps registration order', () => {
    register_renderer(stamp('cards-2'));
    register_renderer(stamp('cards'));
    expect(renderer_names()).toEqual(['graphviz', 'tonal', 'cards-2', 'cards']);
  });

  it('throws on a taken name without replace, naming it, and keeps the first renderer', () => {
    const first  = stamp('cards'),
          second = stamp('cards');
    register_renderer(first);
    const error = thrown(() => { register_renderer(second); });
    expect(error).toBeInstanceOf(JssmError);
    expect((error as Error).message).toContain('"cards"');
    expect((error as Error).message).toContain('replace: true');
    expect(renderer_for('cards')).toBe(first);
  });

  it('replaces a taken name with replace, in its original position', () => {
    const first  = stamp('cards'),
          second = stamp('cards');
    register_renderer(first);
    register_renderer(stamp('cards-2'));
    register_renderer(second, { replace: true });
    expect(renderer_for('cards')).toBe(second);
    expect(renderer_names()).toEqual(['graphviz', 'tonal', 'cards', 'cards-2']);
  });

  it('treats replace on a free name as a plain registration', () => {
    const cards = stamp('cards');
    register_renderer(cards, { replace: true });
    expect(renderer_for('cards')).toBe(cards);
  });

  it('treats replace: false like no options', () => {
    register_renderer(stamp('cards'));
    expect(() => { register_renderer(stamp('cards'), { replace: false }); }).toThrow(JssmError);
  });

  it.each([
    ['null',              null,                                  /must be an object/],
    ['a string',          'cards',                               /must be an object/],
    ['a nameless object', { render: () => '' },                  /non-empty string name/],
    ['an empty name',     { name: '', render: () => '' },        /non-empty string name/],
    ['a numeric name',    { name: 7, render: () => '' },         /non-empty string name/],
    ['no render',         { name: 'cards' },                     /"cards" has no render function/],
    ['a non-function',    { name: 'cards', render: '<svg/>' },   /"cards" has no render function/]
  ])('rejects %s and leaves the registry unchanged', (_label, bad, message) => {
    const error = thrown(() => { register_renderer(bad as unknown as VizRenderProvider); });
    expect(error).toBeInstanceOf(JssmError);
    expect((error as Error).message).toMatch(message);
    expect(renderer_names()).toEqual(['graphviz', 'tonal']);
  });

  it('hands out a copy of the names, so editing it does not edit the registry', () => {
    const names = renderer_names();
    names.push('forged');
    expect(renderer_names()).toEqual(['graphviz', 'tonal']);
  });

});



describe('unregistering application renderers', () => {

  it('removes a registered renderer and reports it', () => {
    register_renderer(stamp('cards'));
    expect(unregister_renderer('cards')).toBe(true);
    expect(renderer_for('cards')).toBeUndefined();
    expect(renderer_names()).toEqual(['graphviz', 'tonal']);
  });

  it('reports false for a name that is not registered', () => {
    expect(unregister_renderer('cards')).toBe(false);
    register_renderer(stamp('cards'));
    unregister_renderer('cards');
    expect(unregister_renderer('cards')).toBe(false);
  });

  it('frees the name for a fresh registration', () => {
    register_renderer(stamp('cards'));
    unregister_renderer('cards');
    const again = stamp('cards');
    register_renderer(again);
    expect(renderer_for('cards')).toBe(again);
  });

});



describe('selecting the renderer for one render call', () => {

  it('falls back to graphviz when nothing names a renderer', () => {
    expect(select_renderer(undefined, undefined)).toBe(graphviz_provider);
  });

  it('uses the machine\'s declared renderer when the options name none', () => {
    expect(select_renderer(undefined, 'tonal')).toBe(tonal_provider);
  });

  it('lets a requested name win over the declared one', () => {
    expect(select_renderer('graphviz', 'tonal')).toBe(graphviz_provider);
  });

  it('uses a requested provider object as-is, registered or not', () => {
    const loose = stamp('unregistered');
    expect(select_renderer(loose, 'tonal')).toBe(loose);
  });

  it('rejects a null provider option from untyped callers instead of falling back', () => {
    expect(() => select_renderer(null as unknown as VizRenderProvider, 'tonal')).toThrow(/must be an object/);
  });

  it('rejects a requested object that is not a usable renderer', () => {
    const error = thrown(() => select_renderer({ name: 'broken' } as unknown as VizRenderProvider, undefined));
    expect(error).toBeInstanceOf(JssmError);
    expect((error as Error).message).toMatch(/"broken" has no render function/);
  });

  it('names an unknown requested renderer, blames the provider option, and lists every registered name', () => {
    register_renderer(stamp('cards'));
    const error = thrown(() => select_renderer('nope', 'tonal'));
    expect(error).toBeInstanceOf(JssmError);
    expect((error as Error).message).toContain('Unknown renderer "nope"');
    expect((error as Error).message).toContain('provider option');
    expect((error as Error).message).toContain('graphviz, tonal, cards');
  });

  it('names an unknown declared renderer and blames graph_renderer', () => {
    const error = thrown(() => select_renderer(undefined, 'nope'));
    expect(error).toBeInstanceOf(JssmError);
    expect((error as Error).message).toContain('Unknown renderer "nope"');
    expect((error as Error).message).toContain('graph_renderer');
  });

  it('treats an empty requested name as a name, not as absent', () => {
    expect(() => select_renderer('', 'tonal')).toThrow('Unknown renderer ""');
  });

  it('finds an application renderer by name once registered, and not after', () => {
    const cards = stamp('cards');
    register_renderer(cards);
    expect(select_renderer(undefined, 'cards')).toBe(cards);
    unregister_renderer('cards');
    expect(() => select_renderer(undefined, 'cards')).toThrow(JssmError);
  });

});



describe('rendering through the registry', () => {

  it('draws with the renderer the FSL names, handing it the machine', async () => {
    register_renderer(stamp('stamp'));
    expect(await fsl_to_svg_string('graph_renderer: stamp; a -> b;'))
      .toBe('<svg data-by="stamp" data-renderer="stamp"></svg>');
  });

  it('selects a quoted renderer name with spaces', async () => {
    register_renderer(stamp('my cards'));
    expect(await fsl_to_svg_string('graph_renderer: "my cards"; a -> b;'))
      .toBe('<svg data-by="my cards" data-renderer="my cards"></svg>');
  });

  it('lets a provider name in the options override the FSL', async () => {
    register_renderer(stamp('stamp'));
    register_renderer(stamp('cards'));
    expect(await machine_to_svg_string(from('graph_renderer: stamp; a -> b;'), { provider: 'cards' }))
      .toBe('<svg data-by="cards" data-renderer="stamp"></svg>');
  });

  it('lets a provider object in the options override the FSL without registering it', async () => {
    register_renderer(stamp('stamp'));
    expect(await fsl_to_svg_string('graph_renderer: stamp; a -> b;', { provider: stamp('loose') }))
      .toBe('<svg data-by="loose" data-renderer="stamp"></svg>');
  });

  it('runs the documented example: Graphviz output tagged with a class', async () => {
    register_renderer({
      name   : 'framed',
      render : async ctx => {
        const svg = await ctx.render_dot(ctx.to_dot(), 'svg');
        return svg.replace('<svg ', '<svg class="framed" ');
      }
    });
    const framed = await fsl_to_svg_string('graph_renderer: framed; a -> b;');
    expect(framed).toContain('<svg class="framed" ');
    expect(framed.replace('<svg class="framed" ', '<svg ')).toBe(await fsl_to_svg_string('a -> b;'));
  });

  it('draws graph_renderer: graphviz exactly like no renderer at all', async () => {
    expect(await fsl_to_svg_string('graph_renderer: graphviz; a -> b -> c;'))
      .toBe(await fsl_to_svg_string('a -> b -> c;'));
  });

  it('passes the graph_layout engine to a registered renderer that lays out through Graphviz', async () => {
    register_renderer(passthrough);
    const ring = 'a -> b -> c -> d -> a;';
    const neato_by_graphviz = await fsl_to_svg_string(`graph_layout: neato; ${ring}`);
    expect(await fsl_to_svg_string(`graph_renderer: passthrough; graph_layout: neato; ${ring}`)).toBe(neato_by_graphviz);
    expect(neato_by_graphviz).not.toBe(await fsl_to_svg_string(ring));
  });

  it('lets the engine option override graph_layout for a registered renderer', async () => {
    register_renderer(passthrough);
    const ring = 'a -> b -> c -> d -> a;';
    expect(await fsl_to_svg_string(`graph_renderer: passthrough; graph_layout: neato; ${ring}`, { engine: 'circo' }))
      .toBe(await fsl_to_svg_string(ring, { engine: 'circo' }));
  });

  it('rejects an unregistered FSL renderer with a JssmError that names it and the registered names', async () => {
    const failure = fsl_to_svg_string('graph_renderer: nowhere; a -> b;');
    await expect(failure).rejects.toThrow(JssmError);
    await expect(failure).rejects.toThrow('Unknown renderer "nowhere", named by the machine\'s graph_renderer.  Registered renderers: graphviz, tonal');
  });

  it('stops selecting a renderer once it is unregistered', async () => {
    register_renderer(stamp('stamp'));
    await expect(fsl_to_svg_string('graph_renderer: stamp; a -> b;')).resolves.toContain('data-by="stamp"');
    unregister_renderer('stamp');
    await expect(fsl_to_svg_string('graph_renderer: stamp; a -> b;')).rejects.toThrow('Unknown renderer "stamp"');
  });

});
