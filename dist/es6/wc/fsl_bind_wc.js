import { LitElement, css } from 'lit';
import { wc_suffix_matches } from './wc_tag_helpers.js';
/**
 * Walk a dotted path into a value.  Used by the `data.path.to.field`
 * variant of {@link resolve_binding}.  Returns `undefined` whenever the
 * traversal would dereference a non-object, missing field, or `null` —
 * matching the natural "missing data" semantics rather than throwing.
 *
 * ```typescript
 * walk_path({ a: { b: 7 } }, 'a.b');     // => 7
 * walk_path({ a: { b: 7 } }, 'a.c');     // => undefined
 * walk_path({ a: { b: 7 } }, 'a.b.c');   // => undefined (7 is not an object)
 * walk_path(undefined,        'a');      // => undefined
 * walk_path({ a: null },     'a.b');     // => undefined (null is not an object)
 * walk_path({ a: 1 },         '');       // => { a: 1 } (empty path = identity)
 * ```
 * @param obj  - The root value to traverse.
 * @param path - Dotted path of property names, e.g. `"a.b.c"`.
 * @returns The terminal value, or `undefined` if any step fails.
 */
export function walk_path(obj, path) {
    if (path.length === 0) {
        return obj;
    }
    let cur = obj;
    for (const part of path.split('.')) {
        if (cur === null || typeof cur !== 'object') {
            return undefined;
        }
        cur = cur[part];
    }
    return cur;
}
/**
 * Resolve a `<jssm-bind>` / `data-jssm-bind` expression against a live
 * machine.  Throws on any unknown expression — bindings fail fast at
 * install time rather than silently producing `undefined` strings in the
 * DOM.
 *
 * Recognized expressions:
 *
 * | Expression       | Resolves to                                   |
 * | ---------------- | --------------------------------------------- |
 * | `data`           | `machine.data()`                              |
 * | `data.a.b.c`     | dotted-path traversal into `machine.data()`   |
 * | `state`          | `machine.state()`                             |
 * | `terminal`       | `machine.is_terminal()`                       |
 * | `complete`       | `machine.is_complete()`                       |
 * | `legal-actions`  | `machine.list_exit_actions().join(' ')`       |
 *
 * ```typescript
 * resolve_binding(m, 'state');              // current state name
 * resolve_binding(m, 'data.username');      // typed-data subfield
 * resolve_binding(m, 'wat');                // throws
 * ```
 * @param m    - The machine whose state/data is being projected.
 * @param expr - The binding expression text (raw attribute value).
 * @returns The resolved value, typed `unknown` since each expression
 *          yields a different shape.
 * @throws Error - When `expr` is not a recognized binding form.
 */
export function resolve_binding(m, expr) {
    switch (expr) {
        case 'state': {
            return m.state();
        }
        case 'terminal': {
            return m.is_terminal();
        }
        case 'complete': {
            return m.is_complete();
        }
        case 'legal-actions': {
            return m.list_exit_actions().map(String).join(' ');
        }
        case 'data': {
            return m.data();
        }
        default: {
            if (expr.startsWith('data.')) {
                // walk the live reference (no whole-tree structuredClone per event),
                // then clone only the extracted leaf so callers still receive a
                // mutation-isolated value exactly as before — clone cost is now
                // proportional to the bound leaf, not the machine's entire data
                const leaf = walk_path(m._data_ref(), expr.slice(5));
                return ((typeof leaf === 'object') && (leaf !== null)) ? structuredClone(leaf) : leaf;
            }
            throw new Error(`<jssm-bind>: unknown binding expression "${expr}"`);
        }
    }
}
/**
 * Apply a resolved binding value to an element's target property.  The
 * `target` selector follows the rules documented in #645:
 *
 * - `textContent` (or omitted) sets `el.textContent` to the value coerced
 *   with `String()`.
 * - Any string starting with `data-` is treated as an attribute name and
 *   set via `setAttribute`, value coerced with `String()`.
 * - Any other string is assigned directly as a property of the element
 *   (no coercion) — supports `value`, `disabled`, `hidden`, `checked`,
 *   and the documented power-user escape hatch.
 *
 * ```typescript
 * set_on_element(span,   'textContent',     7);            // span.textContent = '7'
 * set_on_element(input,  'value',           'hi');         // input.value = 'hi'
 * set_on_element(button, 'disabled',        true);         // button.disabled = true
 * set_on_element(div,    'data-current',    'red');        // setAttribute('data-current', 'red')
 * ```
 * @param el     - The element to update.
 * @param target - Target property name, possibly a `data-*` attribute.
 * @param value  - The resolved value to assign.
 */
export function set_on_element(el, target, value) {
    if (target.startsWith('data-')) {
        // eslint-disable-next-line @typescript-eslint/no-base-to-string -- documented #645 contract: attribute targets coerce with String(); a `data`-bound object rendering '[object Object]' is the shipped behavior
        el.setAttribute(target, String(value));
    }
    else if (target === 'textContent') {
        // eslint-disable-next-line @typescript-eslint/no-base-to-string -- documented #645 contract: textContent coerces with String(); a `data`-bound object rendering '[object Object]' is the shipped behavior
        el.textContent = String(value);
    }
    else {
        // Power-user escape hatch — assigns value as-is so booleans hit
        // properties like `disabled`/`hidden`/`checked` with the correct
        // semantics rather than being coerced to a string.
        el[target] = value;
    }
}
/**
 * Discover every binding declaration under `host` and install live
 * subscriptions that refresh them on every machine transition.  Returns
 * a list of unsubscribe callbacks so the host's `disconnectedCallback`
 * can tear them all down.
 *
 * Two surface forms are recognized:
 *
 * 1. Inline attribute — any descendant with `data-jssm-bind="<expr>"`.
 *    Optional `data-jssm-bind-to="<target>"` chooses the target property
 *    (defaults to `textContent`).
 *
 * 2. Dedicated tag — direct-child `<jssm-bind>` configuration tags with
 *    `selector="<css>"` and `source="<expr>"` attributes, plus an
 *    optional `target="<target>"` (also defaulting to `textContent`).
 *    The `selector` is scoped to `host`'s descendants.
 *
 * Each binding is painted once immediately (using the machine's current
 * state) and then re-painted on every `transition` event.
 *
 * ```typescript
 * // typical install during <jssm-instance>.connectedCallback:
 * const unsubs = install_bindings(this, this.machine);
 * this._unsubs.push(...unsubs);
 * ```
 * @param host    - The host element whose descendants carry the bindings.
 * @param machine - The machine whose state/data is being projected.
 * @returns A flat array of unsubscribe callbacks, one per installed
 *          subscription.
 * @throws Error - When any binding expression is unrecognized
 *                 (propagated from {@link resolve_binding}).
 * @throws Error - When a `<jssm-bind>` tag is missing its `selector`
 *                 or `source` attribute.
 */
export function install_bindings(host, machine) {
    var _a, _b;
    const unsubs = [];
    // Form 1: inline `data-jssm-bind` on descendants.
    const inline_nodes = host.querySelectorAll('[data-jssm-bind]');
    for (const el of inline_nodes) {
        const expr = el.dataset.jssmBind;
        const target = (_a = el.dataset.jssmBindTo) !== null && _a !== void 0 ? _a : 'textContent';
        const apply = () => {
            set_on_element(el, target, resolve_binding(machine, expr));
        };
        apply();
        unsubs.push(machine.on('transition', apply));
    }
    // Form 2: dedicated `<fsl-bind>` / `<jssm-bind>` configuration tags.  Only
    // direct children are considered configuration tags for THIS host — nested
    // `<fsl-instance>` / `<jssm-instance>` children would have their own
    // bindings handled by their own component.
    const all_direct = host.querySelectorAll(':scope > *');
    const config_tags = [...all_direct].filter(el => wc_suffix_matches(el.tagName, 'bind'));
    for (const tag of config_tags) {
        const selector = tag.getAttribute('selector');
        if (selector === null || selector.length === 0) {
            throw new Error('<jssm-bind>: missing required "selector" attribute');
        }
        const expr = tag.getAttribute('source');
        if (expr === null || expr.length === 0) {
            throw new Error('<jssm-bind>: missing required "source" attribute');
        }
        const target = (_b = tag.getAttribute('target')) !== null && _b !== void 0 ? _b : 'textContent';
        const targets = host.querySelectorAll(selector);
        for (const el of targets) {
            const apply = () => {
                set_on_element(el, target, resolve_binding(machine, expr));
            };
            apply();
            unsubs.push(machine.on('transition', apply));
        }
    }
    return unsubs;
}
/**
 * `<fsl-bind>` / `<jssm-bind>` configuration tag.  The element itself is
 * invisible — it carries `selector`, `source`, and optional `target`
 * attributes that the parent `<fsl-instance>` reads during its connection
 * lifecycle to wire up a machine-to-DOM binding.
 *
 * Registering it as a `LitElement` (rather than leaving it as a generic
 * unknown tag) gives it a stable upgrade timing, a `display: none`
 * default style, and a proper place in the custom-elements registry so
 * `customElements.get('fsl-bind')` resolves.
 * @element fsl-bind
 * @attribute selector - CSS selector for the target element(s), scoped to the host.
 * @attribute source - Binding expression (see {@link resolve_binding}).
 * @attribute target - Target property name; defaults to `textContent`.
 */
export class FslBind extends LitElement {
    /**
     * No-op render.  The tag's purpose is purely declarative
     * configuration; it must not contribute any DOM to the page.
     */
    render() {
        return null;
    }
}
FslBind.styles = css `:host { display: none; }`;
