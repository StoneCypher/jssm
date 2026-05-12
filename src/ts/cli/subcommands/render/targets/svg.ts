import { fsl_to_svg_string } from '../../../../jssm_viz';
import { RenderError } from '../../../types';

/**
 * Render FSL source to an SVG string via the `jssm/viz` pipeline.
 *
 * @param fsl - FSL source text
 * @returns SVG string (XML-prefixed, suitable for direct file write)
 * @throws RenderError if the FSL fails to parse or viz fails to render
 *
 * @example
 *   const svg = await svgTarget("a -> b;");
 *   // svg starts with: <?xml version="1.0" ...?><svg ...>
 */
export async function svgTarget(fsl: string): Promise<string> {
  try {
    const raw = await fsl_to_svg_string(fsl);
    // Remove DOCTYPE and comments between XML declaration and <svg> to match expected format
    const cleaned = raw.replace(/^(<\?xml[^>]+\?>)\s*[\s\S]*?(<svg)/m, '$1\n$2');
    return cleaned;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new RenderError(`SVG render failed: ${msg}`);
  }
}
