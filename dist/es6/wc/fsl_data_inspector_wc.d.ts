import { LitElement, type TemplateResult } from 'lit';
/** A classified slice of a pretty-printed JSON string. */
export type JsonTokenKind = 'key' | 'string' | 'number' | 'bool' | 'null' | 'plain';
export interface JsonToken {
    text: string;
    kind: JsonTokenKind;
}
/**
 * Split a pretty-printed JSON string into classified tokens for syntax
 * highlighting. A quoted run is a `key` when the next non-space character is
 * `:`, otherwise a `string`; `true`/`false` are `bool`, `null` is `null`,
 * numbers are `number`, and everything between (braces, commas, whitespace) is
 * `plain`. Driven by the text, not a JSON parse, so it never throws.
 *
 * @param json - A JSON string (typically `JSON.stringify(value, null, 2)`).
 * @returns The tokens in source order; concatenating their `text` reproduces `json`.
 *
 * @example
 * tokenizeJson('{"a": 1}');
 * // [{text:'{',kind:'plain'}, {text:'"a"',kind:'key'}, {text:': ',kind:'plain'},
 * //  {text:'1',kind:'number'}, {text:'}',kind:'plain'}]
 */
export declare function tokenizeJson(json: string): JsonToken[];
/**
 * `<fsl-data-inspector>` — a syntax-highlighted view of a parent
 * `<fsl-instance>`'s extended-state data. Re-reads `host.machine.data()` on the
 * host's transition / data-change / rebuild DOM events. The panel is bounded and
 * scrolls internally (a self-contained vertical column). Renders `no data` when
 * the machine carries none; standalone (no host) renders empty.
 *
 * @element fsl-data-inspector
 * @csspart inspector - The scrollable container.
 */
export declare class FslDataInspector extends LitElement {
    static styles: import("lit").CSSResult;
    private _data;
    private _unbind;
    connectedCallback(): void;
    disconnectedCallback(): void;
    render(): TemplateResult;
}
declare global {
    interface HTMLElementTagNameMap {
        'fsl-data-inspector': FslDataInspector;
    }
}
