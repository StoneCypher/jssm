import type { RenderOptions, RenderResult } from '../../types';
import { render } from './render';

export interface RenderSetItemOk {
  ok: true;
  index: number;
  result: RenderResult;
}

export interface RenderSetItemErr {
  ok: false;
  index: number;
  error: Error;
}

export type RenderSetItem = RenderSetItemOk | RenderSetItemErr;

/**
 * Render multiple FSL source strings in parallel, returning one result
 * per input. Errors are captured per-input rather than aborting the whole
 * batch: callers can inspect which inputs succeeded and which failed.
 *
 * @param inputs - Array of FSL source strings
 * @param opts - Render options applied to every input
 * @returns Array of per-input results, same length and order as `inputs`
 *
 * @example
 *   const results = await renderSet([fsl1, fsl2], { target: 'svg' });
 *   for (const item of results) {
 *     if (item.ok) console.log('rendered #', item.index);
 *     else        console.error('failed #', item.index, item.error.message);
 *   }
 */
export async function renderSet(
  inputs: string[],
  opts: RenderOptions,
): Promise<RenderSetItem[]> {
  return Promise.all(
    inputs.map(async (fsl, index): Promise<RenderSetItem> => {
      try {
        const result = await render(fsl, opts);
        return { ok: true, index, result };
      } catch (e) {
        return {
          ok: false,
          index,
          error: e instanceof Error ? e : new Error(String(e)),
        };
      }
    })
  );
}
