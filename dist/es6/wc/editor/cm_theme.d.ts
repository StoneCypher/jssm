/**
 * Light and dark CodeMirror themes for `fsl-editor`, as extension bundles for a
 * `Compartment` swap. Chrome colors read the shared `--_fsl-*` appearance tokens
 * (so the editor white-labels with the rest of the suite); the dark highlight
 * style maps the FSL stream tokenizer's tags to a palette that reads on a dark
 * background. Ported from the verified sketch editor theme.
 */
import { type Extension } from '@codemirror/state';
/** Light editor theme bundle (token-fed chrome + default highlight style). */
export declare const lightEditorTheme: Extension;
/** Dark editor theme bundle (token-fed chrome + dark highlight, default fallback). */
export declare const darkEditorTheme: Extension;
