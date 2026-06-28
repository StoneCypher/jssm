// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import * as widgets from '../widgets.js';
import '../widgets.define.js';

const CLASSES = [
  'FslToolbar', 'FslFooter', 'FslHelp', 'FslHistory',
  'FslDataInspector', 'FslHookLog', 'FslSimulation', 'FslExport',
] as const;

const TAGS = [
  'fsl-toolbar', 'fsl-footer', 'fsl-help', 'fsl-history',
  'fsl-data-inspector', 'fsl-hook-log', 'fsl-simulation', 'fsl-export',
] as const;

describe('jssm/wc/widgets bundle entry', () => {

  it('re-exports every light widget class', () => {
    const bag = widgets as Record<string, unknown>;
    for (const name of CLASSES) {
      expect(typeof bag[name]).toBe('function');
    }
  });

  it('registers all eight canonical tags with no jssm- synonyms', () => {
    for (const tag of TAGS) {
      expect(customElements.get(tag)).toBeDefined();
      expect(customElements.get(tag.replace('fsl-', 'jssm-'))).toBeUndefined();
    }
  });

});
