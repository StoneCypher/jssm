/**
 * @vitest-environment jsdom
 *
 * Tests for issue #640: `data-jssm-action` inline attribute and the
 * dedicated `<jssm-action>` tag.  Both wire DOM events to machine
 * actions on a hosting `<jssm-instance>`.
 *
 * Coverage targets:
 *   - inline attribute form (default click)
 *   - dedicated tag form via `selector` / `action` / `event`
 *   - custom event names (e.g. change, keydown)
 *   - `from-state` guard prevents firing when state mismatches
 *   - `from-property` extracts the source element's named property as the
 *     action's data argument
 *   - `prevent-default` and `stop-propagation` modifiers
 *   - listener cleanup on disconnect
 *   - defensive: malformed `<jssm-action>` tags are skipped, not thrown
 *   - defensive: `[data-jssm-action]` inside a `<jssm-action>` tag is not
 *     double-wired
 */

import '../jssm_instance_wc.define';
import { JssmInstance } from '../jssm_instance_wc';

/**
 * Build a `<jssm-instance>` with the given inner markup and attach it to
 * the document, returning the typed reference.  Each test owns its
 * element and is responsible for removing it (so disconnect-cleanup tests
 * can run intentionally).
 *
 * FSL is supplied via the `fsl=""` attribute.  The provided markup MUST
 * NOT carry visible text inside elements outside `<jssm-action>` tags —
 * if it did, the host's `textContent`-channel resolver would treat that
 * text as a second FSL source and throw.  In practice the tests use
 * empty buttons / inputs and address them via id / class selectors, so
 * this constraint is easy to satisfy.
 *
 * Children are built via a `<template>` element rather than directly
 * assigning a string, which keeps the test's markup expressive without
 * routing through an `innerHTML` setter on the host element.
 *
 * @param markup - HTML fragment placed inside the host before connection.
 * @param fsl - FSL source supplied via the `fsl` attribute.
 * @returns The connected, typed host element.
 */
function build_host(markup: string, fsl: string): JssmInstance {
  const el = document.createElement('jssm-instance') as JssmInstance;
  el.setAttribute('fsl', fsl);
  const tpl = document.createElement('template');
  tpl.innerHTML = markup;
  el.appendChild(tpl.content);
  document.body.appendChild(el);
  return el;
}

describe('inline data-jssm-action form', () => {

  it('wires a click listener that dispatches the named action by default', () => {
    const host = build_host(
      `<button type="button" id="tick" data-jssm-action="flip"></button>`,
      "Off 'flip' -> On;"
    );
    expect(host.state()).toBe('Off');

    (host.querySelector('#tick') as HTMLButtonElement).click();

    expect(host.state()).toBe('On');
    document.body.removeChild(host);
  });

  it('honors a custom data-jssm-event attribute (change instead of click)', () => {
    const host = build_host(
      `<select id="sel"
               data-jssm-action="flip"
               data-jssm-event="change"></select>`,
      "Off 'flip' -> On;"
    );

    const sel = host.querySelector('#sel') as HTMLSelectElement;
    sel.dispatchEvent(new Event('change'));

    expect(host.state()).toBe('On');
    document.body.removeChild(host);
  });

  it('respects data-jssm-from-state and skips dispatch when state mismatches', () => {
    const host = build_host(
      `<button type="button" id="reset"
               data-jssm-action="reset"
               data-jssm-from-state="configured"></button>`,
      "idle 'set' -> configured; configured 'reset' -> idle;"
    );

    expect(host.state()).toBe('idle');
    (host.querySelector('#reset') as HTMLButtonElement).click();
    // Still in `idle` — the from-state guard refused to dispatch.
    expect(host.state()).toBe('idle');

    // Advance to `configured`, then reset should fire and bring us back.
    host.do('set');
    expect(host.state()).toBe('configured');
    (host.querySelector('#reset') as HTMLButtonElement).click();
    expect(host.state()).toBe('idle');

    document.body.removeChild(host);
  });

  it('passes the source property to action() via data-jssm-from-property', () => {
    const host = build_host(
      `<input id="inp"
              data-jssm-action="set-value"
              data-jssm-event="change"
              data-jssm-from-property="value" />`,
      "idle 'set-value' -> set;"
    );

    const inp = host.querySelector('#inp') as HTMLInputElement;
    inp.value = 'hello';
    inp.dispatchEvent(new Event('change'));

    expect(host.state()).toBe('set');
    // The action's data argument flows through to machine.data().
    expect(host.machine.data()).toBe('hello');
    document.body.removeChild(host);
  });

  it('calls e.preventDefault() when data-jssm-prevent-default is present', () => {
    // Use a standalone button (no enclosing <form>) so jsdom's missing
    // requestSubmit doesn't intrude.  The MouseEvent is cancelable, and
    // preventDefault should flip `defaultPrevented` regardless of form
    // submission semantics.
    const host = build_host(
      `<button type="button" id="submit"
               data-jssm-action="submit"
               data-jssm-event="click"
               data-jssm-prevent-default></button>`,
      "idle 'submit' -> done;"
    );

    const btn = host.querySelector('#submit') as HTMLButtonElement;
    const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
    btn.dispatchEvent(ev);

    expect(ev.defaultPrevented).toBe(true);
    expect(host.state()).toBe('done');
    document.body.removeChild(host);
  });

  it('calls e.stopPropagation() when data-jssm-stop-propagation is present', () => {
    const host = build_host(
      `<div id="outer"><button type="button" id="inner"
               data-jssm-action="flip"
               data-jssm-stop-propagation></button></div>`,
      "Off 'flip' -> On;"
    );

    let outer_received = false;
    (host.querySelector('#outer') as HTMLDivElement)
      .addEventListener('click', () => { outer_received = true; });

    const btn = host.querySelector('#inner') as HTMLButtonElement;
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(outer_received).toBe(false);
    expect(host.state()).toBe('On');
    document.body.removeChild(host);
  });

});

describe('dedicated <jssm-action> tag form', () => {

  it('wires a listener using selector + action + default click event', () => {
    const host = build_host(
      `<button type="button" id="btn"></button>` +
      `<jssm-action selector="#btn" action="flip"></jssm-action>`,
      "Off 'flip' -> On;"
    );

    (host.querySelector('#btn') as HTMLButtonElement).click();
    expect(host.state()).toBe('On');
    document.body.removeChild(host);
  });

  it('honors a custom event attribute on the tag form', () => {
    const host = build_host(
      `<input id="i" />` +
      `<jssm-action selector="#i" event="change" action="set"></jssm-action>`,
      "idle 'set' -> done;"
    );

    (host.querySelector('#i') as HTMLInputElement)
      .dispatchEvent(new Event('change'));
    expect(host.state()).toBe('done');
    document.body.removeChild(host);
  });

  it('respects from-state on the tag form', () => {
    const host = build_host(
      `<button type="button" id="r"></button>` +
      `<jssm-action selector="#r" action="reset" from-state="configured"></jssm-action>`,
      "idle 'set' -> configured; configured 'reset' -> idle;"
    );

    (host.querySelector('#r') as HTMLButtonElement).click();
    expect(host.state()).toBe('idle');

    host.do('set');
    (host.querySelector('#r') as HTMLButtonElement).click();
    expect(host.state()).toBe('idle');
    document.body.removeChild(host);
  });

  it('passes data via from-property on the tag form', () => {
    const host = build_host(
      `<input id="i" />` +
      `<jssm-action selector="#i" event="change"
                    action="set" from-property="value"></jssm-action>`,
      "idle 'set' -> done;"
    );

    const inp = host.querySelector('#i') as HTMLInputElement;
    inp.value = 'payload';
    inp.dispatchEvent(new Event('change'));

    expect(host.state()).toBe('done');
    expect(host.machine.data()).toBe('payload');
    document.body.removeChild(host);
  });

  it('calls preventDefault/stopPropagation on the tag form when configured', () => {
    const host = build_host(
      `<div id="o"><button type="button" id="b"></button></div>` +
      `<jssm-action selector="#b" action="flip"
                    prevent-default stop-propagation></jssm-action>`,
      "Off 'flip' -> On;"
    );

    let outer_received = false;
    (host.querySelector('#o') as HTMLDivElement)
      .addEventListener('click', () => { outer_received = true; });

    const btn = host.querySelector('#b') as HTMLButtonElement;
    const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
    btn.dispatchEvent(ev);

    expect(ev.defaultPrevented).toBe(true);
    expect(outer_received).toBe(false);
    expect(host.state()).toBe('On');
    document.body.removeChild(host);
  });

  it('wires multiple source elements when the selector matches more than one', () => {
    const host = build_host(
      `<button type="button" class="t"></button>` +
      `<button type="button" class="t"></button>` +
      `<jssm-action selector=".t" action="flip"></jssm-action>`,
      "Off 'flip' -> On 'flip' -> Off;"
    );

    const buttons = host.querySelectorAll('.t');
    expect(buttons.length).toBe(2);

    (buttons[0] as HTMLButtonElement).click();
    expect(host.state()).toBe('On');
    (buttons[1] as HTMLButtonElement).click();
    expect(host.state()).toBe('Off');

    document.body.removeChild(host);
  });

  it('skips malformed tags missing required attributes without throwing', () => {
    const host = build_host(
      `<button type="button" id="b" data-jssm-action="flip"></button>` +
      `<jssm-action></jssm-action>` +
      `<jssm-action selector="#b"></jssm-action>` +
      `<jssm-action action="flip"></jssm-action>`,
      "Off 'flip' -> On;"
    );

    // The host should still be functional and the inline button must still fire.
    (host.querySelector('#b') as HTMLButtonElement).click();
    expect(host.state()).toBe('On');
    document.body.removeChild(host);
  });

  it('does not wire [data-jssm-action] descendants of a <jssm-action> tag', () => {
    // The inline scanner explicitly skips elements that descend from a
    // `<jssm-action>` data tag — this exercises the `closest('jssm-action')`
    // skip branch.  The inner button has [data-jssm-action], but it sits
    // inside a <jssm-action> data block and must NOT have a listener
    // attached.
    const host = build_host(
      `<button type="button" id="x"></button>` +
      `<jssm-action selector="#x" action="flip">` +
      `  <button type="button" id="inner" data-jssm-action="flip"></button>` +
      `</jssm-action>`,
      "Off 'flip' -> On;"
    );

    // The inner button should NOT have a click listener.  Confirm by
    // clicking it and checking the machine did not transition.
    (host.querySelector('#inner') as HTMLButtonElement).click();
    expect(host.state()).toBe('Off');

    // The outer button (tag-form wired) DOES transition.
    (host.querySelector('#x') as HTMLButtonElement).click();
    expect(host.state()).toBe('On');

    document.body.removeChild(host);
  });

});

describe('listener cleanup on disconnect', () => {

  it('removes inline-form listeners so post-disconnect events do nothing', () => {
    const host = build_host(
      `<button type="button" id="b" data-jssm-action="flip"></button>`,
      "Off 'flip' -> On;"
    );
    const btn = host.querySelector('#b') as HTMLButtonElement;

    document.body.removeChild(host);

    // After disconnect, the host's machine is still around (we hold the ref),
    // but the listener must be gone — so the click should NOT cause an
    // action dispatch.  Capture state before/after to assert no change.
    const before = host.state();
    btn.click();
    expect(host.state()).toBe(before);
  });

  it('removes tag-form listeners so external sources stop firing actions', () => {
    // Tag-form selector is scoped to the host, but the source element can
    // be appended into the host's light DOM and survive `removeChild` on
    // the host — its listener must still be detached.
    const host = build_host(
      `<button type="button" id="b"></button>` +
      `<jssm-action selector="#b" action="flip"></jssm-action>`,
      "Off 'flip' -> On;"
    );
    const btn = host.querySelector('#b') as HTMLButtonElement;

    document.body.removeChild(host);

    const before = host.state();
    btn.click();
    expect(host.state()).toBe(before);
  });

});
