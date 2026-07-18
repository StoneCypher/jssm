import { readFileSync } from 'fs';
import { resolve } from 'path';
import { extractSurface } from '../../cli/subcommands/codegen/surface';
import { CodegenError } from '../../cli/codegen-types';

const trafficLight = readFileSync(
  resolve(__dirname, 'fixtures/machines/traffic-light.fsl'),
  'utf8',
);

describe('extractSurface', () => {

  it('extracts states, initial, actions, and named transitions', () => {
    const s = extractSurface("a 'go' -> b 'back' -> a;");
    expect(s.states).toEqual(['a', 'b']);
    expect(s.initial).toBe('a');
    expect(s.actions).toEqual(['go', 'back']);
    expect(s.transitions).toEqual([
      { from: 'a', action: 'go', to: 'b' },
      { from: 'b', action: 'back', to: 'a' },
    ]);
  });

  it('skips edges that carry no action', () => {
    // `a -> b` is unnamed: it has no caller-visible trigger, so it is omitted
    // from transitions but its endpoints still appear in states.
    const s = extractSurface('a -> b;');
    expect(s.states).toEqual(['a', 'b']);
    expect(s.actions).toEqual([]);
    expect(s.transitions).toEqual([]);
  });

  it('surfaces the traffic-light fixture faithfully', () => {
    const s = extractSurface(trafficLight);
    expect(s.states).toContain('Off');
    expect(s.states).toContain('Red');
    expect(s.initial).toBe('Off');
    expect(s.actions).toContain('Start');
    expect(s.actions).toContain('Shut down');
    const start = s.transitions.find(t => t.action === 'Start');
    expect(start).toEqual({ from: 'Off', action: 'Start', to: 'Red' });
  });

  it('throws CodegenError on FSL that fails to compile', () => {
    expect(() => extractSurface('not valid fsl !!')).toThrow(CodegenError);
  });

});
