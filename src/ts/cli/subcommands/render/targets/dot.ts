import { fsl_to_dot } from '../../../../jssm_viz.js';
import { RenderError } from '../../../types.js';

/**
 * Render FSL source to a Graphviz DOT string.
 * @param fsl - FSL source text
 * @returns DOT source text, suitable for piping to `dot` or embedding in
 *   tools that consume DOT directly.
 * @throws RenderError if the FSL fails to parse
 * @example
 *   const dot = await dotTarget("a -> b;");
 *   // dot starts with: digraph G {
 */
export function dotTarget(fsl: string): Promise<string> {
  try {
    return Promise.resolve(fsl_to_dot(fsl));
  } catch (error) {
    return Promise.reject(new RenderError(`DOT render failed: ${(error as Error).message}`));
  }
}
