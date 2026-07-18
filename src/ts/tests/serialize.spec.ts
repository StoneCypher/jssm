
import * as jssm from '../jssm';





describe('Serialization', () => {





  test('Creating serializes', () => {

    const foo = jssm.from("a 'next' <-> 'next' b;");

    foo.do('next');
    foo.do('next');

    const ser = foo.serialize(),
          s2  = foo.serialize("test");

    expect(ser.jssm_version)
      .toBe(jssm.version);

    expect(typeof ser.timestamp)
      .toBe('number');

    expect(typeof ser.comment)
      .toBe('undefined');

    expect(s2.comment)
      .toBe('test');

    expect(ser.state)
      .toBe('a');

    expect(ser.history)
      .toStrictEqual( [] );

    expect(ser.history_capacity)
      .toBe(0);

    expect(ser.data)
      .toBe(undefined);

  });



  test('Creating with history and data serializes', () => {

    const foo = jssm.from("a 'next' <-> 'next' b;", { history: 5, data: 2 });

    foo.do('next');
    foo.do('next');

    const ser = foo.serialize(),
          s2  = foo.serialize("test");

    expect(ser.jssm_version)
      .toBe(jssm.version);

    expect(typeof ser.timestamp)
      .toBe('number');

    expect(typeof ser.comment)
      .toBe('undefined');

    expect(s2.comment)
      .toBe('test');

    expect(ser.state)
      .toBe('a');

    expect(ser.history)
      .toStrictEqual([ ['a',2], ['b',2] ]);

    expect(ser.history_capacity)
      .toBe(5);

    expect(ser.data)
      .toBe(2);

  });





} );





describe('Version checking in deserialization', () => {



  describe('compareVersions utility', () => {

    // compareVersions is exported public API; deserialization-level tests
    // exercise it through deserialize, and direct pair tests below pin its
    // exact semantics independently of the current library version.

    test('Detects future major version', () => {
      const machine_str = "a -> b;";
      const foo = jssm.from(machine_str);
      const ser = foo.serialize();
      ser.jssm_version = '999.0.0';

      expect(() => jssm.deserialize(machine_str, ser))
        .toThrow(/Cannot deserialize from future version/);
    });

    test('Detects same version as equal', () => {
      const machine_str = "a -> b;";
      const foo = jssm.from(machine_str);
      const ser = foo.serialize();
      // ser.jssm_version is already the current version

      expect(() => jssm.deserialize(machine_str, ser))
        .not.toThrow();
    });

    test('Accepts older version', () => {
      const machine_str = "a -> b;";
      const foo = jssm.from(machine_str);
      const ser = foo.serialize();
      ser.jssm_version = '0.0.1';

      expect(() => jssm.deserialize(machine_str, ser))
        .not.toThrow();
    });

    test('Handles version with fewer segments than current', () => {
      const machine_str = "a -> b;";
      const foo = jssm.from(machine_str);
      const ser = foo.serialize();
      ser.jssm_version = '0.1';

      expect(() => jssm.deserialize(machine_str, ser))
        .not.toThrow();
    });

    test('Accepts older version with more segments than current', () => {
      const machine_str = "a -> b;";
      const foo = jssm.from(machine_str);
      const ser = foo.serialize();
      ser.jssm_version = '0.0.0.1';

      expect(() => jssm.deserialize(machine_str, ser))
        .not.toThrow();
    });

    test('Rejects future version with more segments than current', () => {
      const machine_str = "a -> b;";
      const foo = jssm.from(machine_str);
      const ser = foo.serialize();
      ser.jssm_version = '999.0.0.1';

      expect(() => jssm.deserialize(machine_str, ser))
        .toThrow(/Cannot deserialize from future version/);
    });

    test('Rejects future version with fewer segments', () => {
      const machine_str = "a -> b;";
      const foo = jssm.from(machine_str);
      const ser = foo.serialize();
      ser.jssm_version = '999.999';

      expect(() => jssm.deserialize(machine_str, ser))
        .toThrow(/Cannot deserialize from future version/);
    });

    test('Refuses to deserialize from a future prerelease version', () => {
      // Regression guard: prerelease identifiers used to become NaN inside
      // the comparator, so future prerelease-stamped data was silently
      // accepted instead of refused.
      const machine_str = "a -> b;";
      const foo = jssm.from(machine_str);
      const ser = foo.serialize();
      ser.jssm_version = '999.0.0-rc.1';

      expect(() => jssm.deserialize(machine_str, ser))
        .toThrow(/Cannot deserialize from future version/);
    });

    test('Refuses when a dot-segment extends the current version', () => {
      // Works whether the current version is a release (the extra segment
      // outranks the implied zero) or a prerelease (the longer identifier
      // set outranks its prefix).
      const machine_str = "a -> b;";
      const foo = jssm.from(machine_str);
      const ser = foo.serialize();
      ser.jssm_version = `${ser.jssm_version}.1`;

      expect(() => jssm.deserialize(machine_str, ser))
        .toThrow(/Cannot deserialize from future version/);
    });

    // Direct pair tests: deterministic regardless of the current library
    // version, covering segment zero-extension and semver prerelease
    // precedence (a prerelease precedes its release; identifiers compare
    // dot-by-dot, numerics below alphanumerics, prefix sets first).

    test('zero-extends missing numeric segments', () => {
      expect(jssm.compareVersions('5.104',     '5.104.0')).toBe(0);
      expect(jssm.compareVersions('5.104.0.0', '5.104.0')).toBe(0);
    });

    test('a prerelease precedes its release', () => {
      expect(jssm.compareVersions('6.0.0-alpha.1', '6.0.0')).toBeLessThan(0);
      expect(jssm.compareVersions('6.0.0', '6.0.0-alpha.1')).toBeGreaterThan(0);
    });

    test('numeric prerelease identifiers compare numerically', () => {
      expect(jssm.compareVersions('6.0.0-alpha.1', '6.0.0-alpha.2')).toBeLessThan(0);
      expect(jssm.compareVersions('6.0.0-alpha.10', '6.0.0-alpha.9')).toBeGreaterThan(0);
    });

    test('alphanumeric prerelease identifiers compare in ASCII order', () => {
      expect(jssm.compareVersions('6.0.0-alpha.1', '6.0.0-beta.1')).toBeLessThan(0);
      expect(jssm.compareVersions('6.0.0-beta.1', '6.0.0-alpha.1')).toBeGreaterThan(0);
    });

    test('numeric prerelease identifiers rank below alphanumeric ones', () => {
      expect(jssm.compareVersions('6.0.0-1', '6.0.0-alpha')).toBeLessThan(0);
      expect(jssm.compareVersions('6.0.0-alpha', '6.0.0-1')).toBeGreaterThan(0);
    });

    test('a shorter prerelease identifier set precedes a longer one it prefixes', () => {
      expect(jssm.compareVersions('6.0.0-alpha', '6.0.0-alpha.1')).toBeLessThan(0);
      expect(jssm.compareVersions('6.0.0-alpha.1.0', '6.0.0-alpha.1')).toBeGreaterThan(0);
    });

    test('identical prereleases compare equal', () => {
      expect(jssm.compareVersions('6.0.0-alpha.1', '6.0.0-alpha.1')).toBe(0);
    });

  });



  test('Refuses to deserialize from future major version', () => {

    const machine_str = "a 'next' <-> 'next' b;";
    const foo = jssm.from(machine_str);

    foo.do('next');
    const ser = foo.serialize();

    // Modify serialization to have a future major version
    ser.jssm_version = '999.0.0';

    expect(() => {
      jssm.deserialize(machine_str, ser);
    }).toThrow(/Cannot deserialize from future version/);

  });



  test('Refuses to deserialize from future minor version', () => {

    const machine_str = "a 'next' <-> 'next' b;";
    const foo = jssm.from(machine_str);

    foo.do('next');
    const ser = foo.serialize();

    // Get current version and increment minor
    const currentVersion = jssm.version.split('.');
    const futureMinor = `${currentVersion[0]}.${parseInt(currentVersion[1]) + 100}.0`;
    ser.jssm_version = futureMinor;

    expect(() => {
      jssm.deserialize(machine_str, ser);
    }).toThrow(/Cannot deserialize from future version/);

  });



  test('Refuses to deserialize from future patch version', () => {

    const machine_str = "a 'next' <-> 'next' b;";
    const foo = jssm.from(machine_str);

    foo.do('next');
    const ser = foo.serialize();

    // Get current version and increment patch
    const currentVersion = jssm.version.split('.');
    const futurePatch = `${currentVersion[0]}.${currentVersion[1]}.${parseInt(currentVersion[2]) + 100}`;
    ser.jssm_version = futurePatch;

    expect(() => {
      jssm.deserialize(machine_str, ser);
    }).toThrow(/Cannot deserialize from future version/);

  });



  test('Allows deserialize from same version', () => {

    const machine_str = "a 'next' <-> 'next' b;";
    const foo = jssm.from(machine_str);

    foo.do('next');
    const ser = foo.serialize();

    // Should not throw - same version
    expect(() => {
      jssm.deserialize(machine_str, ser);
    }).not.toThrow();

  });



  test('Allows deserialize from older major version', () => {

    const machine_str = "a 'next' <-> 'next' b;";
    const foo = jssm.from(machine_str);

    foo.do('next');
    const ser = foo.serialize();

    // Modify to older major version
    ser.jssm_version = '1.0.0';

    // Should not throw - older version
    expect(() => {
      jssm.deserialize(machine_str, ser);
    }).not.toThrow();

  });



  test('Allows deserialize from older minor version', () => {

    const machine_str = "a 'next' <-> 'next' b;";
    const foo = jssm.from(machine_str);

    foo.do('next');
    const ser = foo.serialize();

    // Get current version and decrement minor
    const currentVersion = jssm.version.split('.');
    const minorNum = parseInt(currentVersion[1]);
    if (minorNum > 0) {
      const olderMinor = `${currentVersion[0]}.${minorNum - 1}.0`;
      ser.jssm_version = olderMinor;

      // Should not throw - older version
      expect(() => {
        jssm.deserialize(machine_str, ser);
      }).not.toThrow();
    }

  });



  test('Allows deserialize from older patch version', () => {

    const machine_str = "a 'next' <-> 'next' b;";
    const foo = jssm.from(machine_str);

    foo.do('next');
    const ser = foo.serialize();

    // Get current version and decrement patch
    const currentVersion = jssm.version.split('.');
    const patchNum = parseInt(currentVersion[2]);
    if (patchNum > 0) {
      const olderPatch = `${currentVersion[0]}.${currentVersion[1]}.${patchNum - 1}`;
      ser.jssm_version = olderPatch;

      // Should not throw - older version
      expect(() => {
        jssm.deserialize(machine_str, ser);
      }).not.toThrow();
    }

  });



  test('Error message includes both versions', () => {

    const machine_str = "a 'next' <-> 'next' b;";
    const foo = jssm.from(machine_str);

    foo.do('next');
    const ser = foo.serialize();

    ser.jssm_version = '999.0.0';

    // Capture rather than assert-inside-catch: `fail()` is a jest global that
    // vitest does not provide, so the old `fail('Should have thrown an error')`
    // threw a ReferenceError that its own catch then swallowed and asserted
    // against.  If deserialize stops throwing, `caught` stays undefined and the
    // instanceof check below fails loudly.
    let caught: unknown;

    try {
      jssm.deserialize(machine_str, ser);
    } catch (error) { caught = error; }

    expect(caught).toBeInstanceOf(Error);

    const message = (caught as Error).message;

    expect(message).toContain('999.0.0');
    expect(message).toContain(jssm.version);
    expect(message).toContain('Please upgrade jssm');

  });



  test('Successfully deserializes with version check passing', () => {

    const machine_str = "a 'next' <-> 'next' b;";
    const foo = jssm.from(machine_str, { history: 5, data: 42 });

    foo.do('next');
    foo.do('next');

    const ser = foo.serialize();
    const bar = jssm.deserialize(machine_str, ser);

    // Verify deserialization worked correctly
    expect(bar.state).toBe(foo.state);
    expect(bar.history).toStrictEqual(foo.history);
    expect(bar.data).toBe(foo.data);

  });



} );





describe('Deserialization', () => {





  test('Creating deserializes', () => {

    const machine_str = "a 'next' <-> 'next' b;"

    const foo = jssm.from(machine_str);

    foo.do('next');
    foo.do('next');
    foo.do('next');

    const ser = foo.serialize(),
          bar = jssm.deserialize(machine_str, ser);

    expect(foo.state)
      .toBe(bar.state);

    expect(foo.history)
      .toStrictEqual(bar.history);

    expect(foo._history.capacity)
      .toBe(bar._history.capacity);

    expect(foo.data)
      .toStrictEqual(bar.data);

  });



  test('Creating with history and data deserializes', () => {

    const machine_str = "a 'next' <-> 'next' b;"

    const foo = jssm.from(machine_str, { history: 5, data: 2 });

    foo.do('next');
    foo.do('next');
    foo.do('next');

    const ser = foo.serialize(),
          bar = jssm.deserialize(machine_str, ser);

    expect(foo.state)
      .toBe(bar.state);

    expect(foo.history)
      .toStrictEqual(bar.history);

    expect(foo._history.capacity)
      .toBe(bar._history.capacity);

    expect(foo.data)
      .toStrictEqual(bar.data);

  });



  // deserialize used to overwrite _state directly after from() had already armed
  // the *initial* state's after-timer, leaving a ghost timer for the wrong state
  // and no timer for the restored state.  StoneCypher/fsl#1946
  test('deserialize leaves no ghost after-timer for a state that has no after', () => {
    const fsl = 'a -> b; a after 60s -> z;';
    const src = jssm.from(fsl, {});
    src.transition('b');                                  // now in b, which has no after
    const d = jssm.deserialize(fsl, src.serialize());
    expect(d.state()).toBe('b');
    expect(d.current_state_timeout()).toBe(undefined);    // was ['z',60000] before the fix
    d.clear_state_timeout();                              // don't leak a real 60s timer
  });

  test('deserialize arms the restored state\'s own after-timer', () => {
    const fsl = 'x -> a; a after 60s -> z;';
    const src = jssm.from(fsl, {});
    src.transition('a');                                  // now in a, which has an after
    const d = jssm.deserialize(fsl, src.serialize());
    expect(d.state()).toBe('a');
    expect(d.current_state_timeout()).toStrictEqual(['z', 60_000]);   // was undefined before the fix
    d.clear_state_timeout();
  });

  test('deserialize into the initial after-state arms its timer exactly once', () => {
    const fsl = 'a after 60s -> z;';
    const src = jssm.from(fsl, {});
    const d = jssm.deserialize(fsl, src.serialize());
    expect(d.state()).toBe('a');
    expect(d.current_state_timeout()).toStrictEqual(['z', 60_000]);
    d.clear_state_timeout();
  });



} );
