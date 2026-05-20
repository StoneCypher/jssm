import { svgTarget } from './svg';
import { RenderError } from '../../../types';

const escapeHtml = (s: string): string => s
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

/**
 * Render FSL source to an HTML document with the SVG embedded inline.
 *
 * The page is intentionally minimal: a `<title>`, basic centering, and the
 * SVG. Designed for "render and email this" or "open in a browser" workflows.
 *
 * @param fsl - FSL source text
 * @param opts.title - Optional document title; defaults to "FSL Machine"
 * @returns HTML document text
 * @throws RenderError if the FSL fails to parse or render
 *
 * @example
 *   const html = await htmlTarget("a -> b;", { title: "My Machine" });
 *   // html starts with: <!DOCTYPE html>...<title>My Machine</title>...
 */
export async function htmlTarget(fsl: string, opts: { title?: string } = {}): Promise<string> {
  const title = escapeHtml(opts.title ?? 'FSL Machine');
  let svg: string;
  try {
    svg = await svgTarget(fsl);
  } catch (e) {
    throw e instanceof RenderError ? e : new RenderError(`HTML render failed: ${String(e)}`);
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>
body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; margin: 2rem auto; max-width: 80rem; padding: 0 1rem; color: #222; }
h1 { font-size: 1.4rem; margin-bottom: 1.5rem; }
.diagram { display: flex; justify-content: center; }
.diagram svg { max-width: 100%; height: auto; }
</style>
</head>
<body>
<h1>${title}</h1>
<div class="diagram">
${svg}
</div>
</body>
</html>
`;
}
