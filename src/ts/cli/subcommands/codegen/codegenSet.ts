import type { CodegenOptions, CodegenArtifact } from '../../codegen-types';
import { codegen } from './codegen';

export interface CodegenSetItemOk {
  ok: true;
  index: number;
  artifact: CodegenArtifact;
}

export interface CodegenSetItemErr {
  ok: false;
  index: number;
  error: Error;
}

export type CodegenSetItem = CodegenSetItemOk | CodegenSetItemErr;

/**
 * Generate host source for multiple FSL documents, returning one result per
 * input. Errors are captured per-input rather than aborting the batch — so a
 * caller learns exactly which documents generated and which failed, mirroring
 * `renderSet`.
 *
 * @param inputs - FSL source strings
 * @param opts - Codegen options applied to every input
 * @returns Per-input results, same length and order as `inputs`
 *
 * @example
 *   const results = codegenSet([fslA, fslB], { target: 'native:javascript' });
 *   for (const item of results) {
 *     if (item.ok) console.log('generated #', item.index);
 *     else         console.error('failed #', item.index, item.error.message);
 *   }
 */
export function codegenSet(inputs: string[], opts: CodegenOptions): CodegenSetItem[] {
  return inputs.map((fsl, index): CodegenSetItem => {
    try {
      return { ok: true, index, artifact: codegen(fsl, opts) };
    } catch (e) {
      return { ok: false, index, error: e as Error };
    }
  });
}
