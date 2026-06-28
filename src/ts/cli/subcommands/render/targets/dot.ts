import { fsl_to_dot } from '../../../../jssm_viz.js';
import { RenderError } from '../../../types.js';

/**
 * Render FSL source to a Graphviz DOT string.
 *
 * @param fsl - FSL source text
 * @returns DOT source text, suitable for piping to `dot` or embedding in
 *   tools that consume DOT directly.
 * @throws RenderError if the FSL fails to parse
 *
 * @example
 *   const dot = await dotTarget("a -> b;");
 *   // dot starts with: digraph G {
 */
export async function dotTarget(fsl: string): Promise<string> {
  try {
    return fsl_to_dot(fsl);
  } catch (e) {
    throw new RenderError(`DOT render failed: ${(e as Error).message}`);
  }
}
