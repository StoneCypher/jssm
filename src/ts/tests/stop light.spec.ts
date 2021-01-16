
/* eslint-disable max-len */

import * as jssm from '../jssm';





describe('Simple stop light', () => {

  // const trs = [
  //         { name: 'SwitchToWarn', action: 'Proceed', from:'Green',  to:'Yellow' },
  //         { name: 'SwitchToHalt', action: 'Proceed', from:'Yellow', to:'Red'    },
  //         { name: 'SwitchToGo',   action: 'Proceed', from:'Red',    to:'Green'  }
  //       ],
  //       light = new jssm.Machine({
  //         start_states : ['Red'],
  //         transitions  : trs
  //       });

  const light = jssm.sm`Red 'Proceed' -> Green 'Proceed' -> Yellow 'Proceed' -> Red;`;

  const r_states = light.states();

  test('has the right state count', () =>
    expect(r_states.length).toBe(3));

  ['Red', 'Yellow', 'Green'].map(c =>
    test(`has state "${c}"`, () =>
      expect(r_states.includes(c)).toBe(true))
  );

  describe('- `proceed` walkthrough', () => {

    test('machine starts red',  () => expect( light.state()           ).toBe( "Red"    ));
    test('proceed is true',     () => expect( light.action('Proceed') ).toBe( true     ));
    test('light is now green',  () => expect( light.state()           ).toBe( "Green"  ));
    test('proceed is true 2',   () => expect( light.action('Proceed') ).toBe( true     ));
    test('light is now yellow', () => expect( light.state()           ).toBe( "Yellow" ));
    test('proceed is true 3',   () => expect( light.action('Proceed') ).toBe( true     ));
    test('light is red again',  () => expect( light.state()           ).toBe( "Red"    ));

  });

  describe('- mixed - `proceed` and `transition`', () => {

    test('machine starts red',              () => expect( light.state()              ).toBe("Red")    );
    test('proceed is true',                 () => expect( light.action('Proceed')    ).toBe( true )   );
    test('machine is now green',            () => expect( light.state()              ).toBe("Green")  );

    test('refuses transition red',          () => expect( light.transition('Red')    ).toBe( false )  );
    test('green still green',               () => expect( light.state()              ).toBe("Green")  );
    test('refuses transition green',        () => expect( light.transition('Green')  ).toBe( false )  );
    test('green still green',               () => expect( light.state()              ).toBe("Green")  );
    test('accepts transition yellow',       () => expect( light.transition('Yellow') ).toBe( true )   );
    test('green now yellow',                () => expect( light.state()              ).toBe("Yellow") );

    test('proceed is true',                 () => expect( light.action('Proceed')    ).toBe( true )   );
    test('machine is now red',              () => expect( light.state()              ).toBe("Red")    );

    test('refuses transition yellow',       () => expect( light.transition('Yellow') ).toBe( false )  );
    test('green still green',               () => expect( light.state()              ).toBe("Red")    );
    test('refuses transition red',          () => expect( light.transition('Red')    ).toBe( false )  );
    test('green still green',               () => expect( light.state()              ).toBe("Red")    );
    test('accepts transition green',        () => expect( light.transition('Green')  ).toBe( true )   );
    test('red now green',                   () => expect( light.state()              ).toBe("Green")  );

    test('proceed is true',                 () => expect( light.action('Proceed')    ).toBe( true )   );
    test('machine is now yellow',           () => expect( light.state()              ).toBe("Yellow") );
    test('proceed is true',                 () => expect( light.action('Proceed')    ).toBe( true )   );
    test('machine is now red',              () => expect( light.state()              ).toBe("Red")    );

  });

});







describe('Complex stop light', () => {

  const light2 = new jssm.Machine({

    start_states: ['off'],

    transitions:[

      { name:'turn_on',     kind: 'legal', forced_only: false, main_path: false, action:'power_on',  from:'off',    to:'red'},

      {                     kind: 'legal', forced_only: false, main_path: false, action:'power_off', from:'red',    to:'off' },
      {                     kind: 'legal', forced_only: false, main_path: false, action:'power_off', from:'yellow', to:'off' },
      {                     kind: 'legal', forced_only: false, main_path: false, action:'power_off', from:'green',  to:'off' },

      { name:'switch_warn', kind: 'legal', forced_only: false, main_path: false, action:'proceed',   from:'green',  to:'yellow' },
      { name:'switch_halt', kind: 'legal', forced_only: false, main_path: false, action:'proceed',   from:'yellow', to:'red'    },
      { name:'switch_go',   kind: 'legal', forced_only: false, main_path: false, action:'proceed',   from:'red',    to:'green'  }

    ]

  });

  const r_states = light2.states();

  test('has the right state count', () =>
    expect(r_states.length).toBe(4));

  ['red', 'yellow', 'green', 'off'].map(c =>
    test(`has state "${c}"`, () =>
      expect(r_states.includes(c)).toBe(true))
  );

  const r_names = light2.list_named_transitions();

  test('has the right named transition count', () =>
    expect(r_names.size).toBe(4));

  ['turn_on', 'switch_warn', 'switch_halt', 'switch_go'].map(a =>
    test(`has named transition "${a}"`, () =>
      expect(r_names.has(a)).toBe(true))
  );

  test('has the right exit actions for red', () =>
    expect(['power_off', 'proceed']).toEqual(light2.list_exit_actions('red')) );


  describe('- `transition` walkthrough', () => {

    test('machine starts off',    () => expect( light2.state()              ).toBe("off")    );
    test('off refuses green',     () => expect( light2.transition('green')  ).toBe(false)    );
    test('off refuses yellow',    () => expect( light2.transition('yellow') ).toBe(false)    );

    test('off refuses proceed',   () => expect( light2.action('proceed')    ).toBe(false)    );

    test('off accepts red',       () => expect( light2.transition('red')    ).toBe(true)     );
    test('off is now red',        () => expect( light2.state()              ).toBe("red")    );
    test('red refuses yellow',    () => expect( light2.transition('yellow') ).toBe(false)    );
    test('red still red',         () => expect( light2.state()              ).toBe("red")    );
    test('red refuses red',       () => expect( light2.transition('red')    ).toBe(false)    );
    test('red still red 2',       () => expect( light2.state()              ).toBe("red")    );

    test('red accepts green',     () => expect( light2.transition('green')  ).toBe(true)     );
    test('red now green',         () => expect( light2.state()              ).toBe("green")  );
    test('green refuses red',     () => expect( light2.transition('red')    ).toBe(false)    );
    test('green still green',     () => expect( light2.state()              ).toBe("green")  );
    test('green refuses green',   () => expect( light2.transition('green')  ).toBe(false)    );
    test('green still green 2',   () => expect( light2.state()              ).toBe("green")  );

    test('green accepts yellow',  () => expect( light2.transition('yellow') ).toBe(true)     );
    test('green now yellow',      () => expect( light2.state()              ).toBe("yellow") );
    test('yellow refuses green',  () => expect( light2.transition('green')  ).toBe(false)    );
    test('yellow still yellow',   () => expect( light2.state()              ).toBe("yellow") );
    test('yellow refuses yellow', () => expect( light2.transition('yellow') ).toBe(false)    );
    test('yellow still yellow 2', () => expect( light2.state()              ).toBe("yellow") );

    test('yellow accepts red',    () => expect( light2.transition('red')    ).toBe(true)     );
    test('back to red',           () => expect( light2.state()              ).toBe("red")    );

    test('proceed is true',       () => expect( light2.action('proceed')    ).toBe(true)     );
    test('light is now green',    () => expect( light2.state()              ).toBe("green")  );

  });

});
