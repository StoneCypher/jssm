
import { sm, from as sm_from } from '../jssm';





// Coverage for StoneCypher/fsl#1264 (no practical way to set `.data` to
// `undefined`) and StoneCypher/fsl#935 (hook complex returns must support
// assigning false / undefined / null faithfully).
//
// The rule under test: a data argument that was explicitly *provided* is
// always committed exactly, even when it is `undefined` or another falsy
// value; a data argument that was *omitted* always preserves the current
// data.  Provision is detected by arity, not by comparison to `undefined`.





describe('fsl#1264 — explicit data provision vs omission', () => {

  describe('hook-free transition path', () => {

    test('transition with explicit undefined sets data to undefined', () => {
      const m = sm_from(`a -> b;`, { data: 1 });
      expect(m.data()).toBe(1);
      expect(m.transition('b', undefined)).toBe(true);
      expect(m.data()).toBe(undefined);
    });

    test('transition with data omitted preserves data', () => {
      const m = sm_from(`a -> b;`, { data: 1 });
      expect(m.transition('b')).toBe(true);
      expect(m.data()).toBe(1);
    });

    test('go with explicit null sets data to null', () => {
      const m = sm_from(`a -> b;`, { data: 'x' });
      expect(m.go('b', null)).toBe(true);
      expect(m.data()).toBe(null);
    });

    test('do with explicit false sets data to false', () => {
      const m = sm_from(`a 'step' -> b;`, { data: 'x' });
      expect(m.do('step', false)).toBe(true);
      expect(m.data()).toBe(false);
    });

    test('action with explicit undefined sets data to undefined', () => {
      const m = sm_from(`a 'step' -> b;`, { data: 'x' });
      expect(m.action('step', undefined)).toBe(true);
      expect(m.data()).toBe(undefined);
    });

    test('force_transition with explicit undefined sets data to undefined', () => {
      const m = sm_from(`a -> b; a ~> c;`, { data: 3 });
      expect(m.force_transition('c', undefined)).toBe(true);
      expect(m.data()).toBe(undefined);
    });

    test('force_transition with data omitted preserves data', () => {
      const m = sm_from(`a -> b; a ~> c;`, { data: 3 });
      expect(m.force_transition('c')).toBe(true);
      expect(m.data()).toBe(3);
    });

  });

  describe('hooked transition path', () => {

    test('explicit undefined data commits when hooks pass', () => {
      const m = sm_from(`a -> b;`, { data: 1 });
      m.hook_any_transition(() => true);
      expect(m.transition('b', undefined)).toBe(true);
      expect(m.data()).toBe(undefined);
    });

    test('omitted data is preserved when hooks pass', () => {
      const m = sm_from(`a -> b;`, { data: 1 });
      m.hook_any_transition(() => true);
      expect(m.transition('b')).toBe(true);
      expect(m.data()).toBe(1);
    });

  });

  describe('override data retention', () => {

    test('override without data preserves data', () => {
      const m = sm_from(`allows_override: true; a -> b;`, { data: 9 });
      m.override('b');
      expect(m.state()).toBe('b');
      expect(m.data()).toBe(9);
    });

    test('override with explicit undefined clears data', () => {
      const m = sm_from(`allows_override: true; a -> b;`, { data: 9 });
      m.override('b', undefined);
      expect(m.data()).toBe(undefined);
    });

    test('override without data fires no data-change event', () => {
      const m = sm_from(`allows_override: true; a -> b;`, { data: 9 });
      let count = 0;
      m.on('data-change', () => { count += 1; });
      m.override('b');
      expect(count).toBe(0);
    });

    test('override with explicit undefined fires data-change to undefined', () => {
      const m = sm_from(`allows_override: true; a -> b;`, { data: 9 });
      let received: any = null;    
      m.on('data-change', e => { received = e; });
      m.override('b', undefined);
      expect(received.cause).toBe('override');
      expect(received.old_data).toBe(9);
      expect(received.new_data).toBe(undefined);
    });

  });

  describe('set_data', () => {

    test('set_data replaces data without a state change', () => {
      const m = sm_from(`a -> b;`, { data: 1 });
      m.set_data(5);
      expect(m.data()).toBe(5);
      expect(m.state()).toBe('a');
    });

    test('set_data(undefined) sets data to undefined', () => {
      const m = sm_from(`a -> b;`, { data: 1 });
      m.set_data(undefined);
      expect(m.data()).toBe(undefined);
    });

    test('set_data(null) and set_data(false) commit exactly', () => {
      const m = sm_from(`a -> b;`, { data: 1 });
      m.set_data(null);
      expect(m.data()).toBe(null);
      m.set_data(false);
      expect(m.data()).toBe(false);
    });

    test('set_data fires data-change with cause set_data', () => {
      const m = sm_from(`a -> b;`, { data: 1 });
      let received: any = null;    
      m.on('data-change', e => { received = e; });
      m.set_data(5);
      expect(received.cause).toBe('set_data');
      expect(received.old_data).toBe(1);
      expect(received.new_data).toBe(5);
      expect(received.from).toBe('a');
      expect(received.to).toBe('a');
    });

    test('set_data with an identical value fires no data-change', () => {
      const m = sm_from(`a -> b;`, { data: 5 });
      let count = 0;
      m.on('data-change', () => { count += 1; });
      m.set_data(5);
      expect(count).toBe(0);
    });

    test('set_data returns the machine for chaining', () => {
      const m = sm_from(`a -> b;`, { data: 1 });
      expect(m.set_data(2)).toBe(m);
    });

  });

});





describe('fsl#935 — hook complex results carry falsy data faithfully', () => {

  const falsies: Array<[string, unknown]> = [
    [ 'undefined', undefined ],
    [ 'null',      null      ],
    [ 'false',     false     ],
    [ 'zero',      0         ],
    [ 'empty string', ''     ],
  ];

  for (const [label, value] of falsies) {
    test(`any-transition hook assigning ${label} commits exactly`, () => {
      const m = sm_from(`a -> b;`, { data: 'seed' });
      m.hook_any_transition(() => ({ pass: true, data: value }));
      expect(m.go('b')).toBe(true);
      expect(m.data()).toBe(value);
    });
  }

  test('specific edge hook assigning undefined commits exactly', () => {
    const m = sm_from(`a -> b;`, { data: 'seed' });
    m.hook('a', 'b', () => ({ pass: true, data: undefined }));
    expect(m.go('b')).toBe(true);
    expect(m.data()).toBe(undefined);
  });

  test('a complex pass without a data key leaves data untouched', () => {
    const m = sm_from(`a -> b;`, { data: 'seed' });
    m.hook_any_transition(() => ({ pass: true }));
    expect(m.go('b')).toBe(true);
    expect(m.data()).toBe('seed');
  });

});
