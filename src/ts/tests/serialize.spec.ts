
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

    // Note: compareVersions is an internal utility function
    // We test it indirectly through deserialization behavior

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

    try {
      jssm.deserialize(machine_str, ser);
      fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.message).toContain('999.0.0');
      expect(error.message).toContain(jssm.version);
      expect(error.message).toContain('Please upgrade jssm');
    }

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





} );
