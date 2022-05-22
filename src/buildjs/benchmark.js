
const b    = require('benny'),
      jssm = require('../../dist/jssm.es5.cjs'),
      sm   = jssm.sm;





const Tl4 = sm`red => green => yellow => red; [red yellow green] ~> off -> red;`;

function TransitionCycleTL100Times() {

  for (let i=0; i<100; ++i) {
    Tl4.transition('green');
    Tl4.transition('yellow');
    Tl4.transition('red');
  }

}





const Tl4A = sm`red 'next' => green 'next' => yellow 'next' => red; [red yellow green] ~> off -> red;`;

function ActionCycleTL100Times() {

  for (let i=0; i<100; ++i) {
    Tl4A.action('next');
    Tl4A.action('next');
    Tl4A.action('next');
  }

}





const Tl4WH = sm`red => green => yellow => red; [red yellow green] ~> off -> red;`;
Tl4WH.set_hook({ from: 'red', to: 'green', handler: () => true, kind: 'hook' });

function TransitionCycleTLWithHooks100Times() {

  for (let i=0; i<100; ++i) {
    Tl4WH.transition('green');
    Tl4WH.transition('yellow');
    Tl4WH.transition('red');
  }

}





const Tl4WAHA = sm`red 'foo' => green => yellow => red; [red yellow green] ~> off -> red;`;
Tl4WAHA.set_hook({ from: 'red', to: 'green', name: 'foo', handler: () => true, kind: 'named' });

function TransitionCycleTLWithNamedHooks100Times() {

  for (let i=0; i<100; ++i) {
    Tl4WAHA.transition('green');
    Tl4WAHA.transition('yellow');
    Tl4WAHA.transition('red');
  }

}





const Tl4AT = sm`red 'foo' => green => yellow => red; [red yellow green] ~> off -> red;`;
Tl4AT.set_hook({ handler: () => true, kind: 'any transition' });

function TransitionCycleTLWithAnyTransitionHooks100Times() {

  for (let i=0; i<100; ++i) {
    Tl4AT.transition('green');
    Tl4AT.transition('yellow');
    Tl4AT.transition('red');
  }

}





const Tl4EX = sm`red 'foo' => green => yellow => red; [red yellow green] ~> off -> red;`;
Tl4EX.set_hook({ handler: () => true, from: 'red', kind: 'exit' });

function TransitionCycleTLWithExitHooks100Times() {

  for (let i=0; i<100; ++i) {
    Tl4EX.transition('green');
    Tl4EX.transition('yellow');
    Tl4EX.transition('red');
  }

}





const Tl4EN = sm`red 'foo' => green => yellow => red; [red yellow green] ~> off -> red;`;
Tl4EN.set_hook({ handler: () => true, to: 'red', kind: 'entry' });

function TransitionCycleTLWithEnterHooks100Times() {

  for (let i=0; i<100; ++i) {
    Tl4EN.transition('green');
    Tl4EN.transition('yellow');
    Tl4EN.transition('red');
  }

}





const Tl4ST = sm`red 'foo' -> green -> yellow -> red; [red yellow green] ~> off -> red;`;
Tl4ST.set_hook({ handler: () => true, to: 'red', kind: 'standard transition' });

function TransitionCycleTLWithSTHooks100Times() {

  for (let i=0; i<100; ++i) {
    Tl4ST.transition('green');
    Tl4ST.transition('yellow');
    Tl4ST.transition('red');
  }

}





const Tl4MT = sm`red 'foo' => green => yellow => red; [red yellow green] ~> off -> red;`;
Tl4MT.set_hook({ handler: () => true, to: 'red', kind: 'main transition' });

function TransitionCycleTLWithMTHooks100Times() {

  for (let i=0; i<100; ++i) {
    Tl4MT.transition('green');
    Tl4MT.transition('yellow');
    Tl4MT.transition('red');
  }

}





const Tl4FT = sm`red 'foo' ~> green ~> yellow ~> red; [red yellow green] ~> off -> red;`;
Tl4FT.set_hook({ handler: () => true, to: 'red', kind: 'forced transition' });

function TransitionCycleTLWithFTHooks100Times() {

  for (let i=0; i<100; ++i) {
    Tl4FT.transition('green');
    Tl4FT.transition('yellow');
    Tl4FT.transition('red');
  }

}





const Tl4WA = sm`red 'next' => green 'next' => yellow 'next' => red; [red yellow green] ~> off -> red;`;

function ActionCycleTL100Times() {

  for (let i=0; i<100; ++i) {
    Tl4WA.action('next');  // to green
    Tl4WA.action('next');  // to yellow
    Tl4WA.action('next');  // to red
  }

}






const Tl4WAWH = sm`red 'next' => green 'next' => yellow 'next' => red; [red yellow green] ~> off -> red;`;
Tl4WAWH.set_hook({ from: 'red', to: 'green', handler: () => true, kind: 'hook' });

function ActionCycleTLWithHooks100Times() {

  for (let i=0; i<100; ++i) {
    Tl4WAWH.action('next');  // to green
    Tl4WAWH.action('next');  // to yellow
    Tl4WAWH.action('next');  // to red
  }

}






const Tl4WAWHA = sm`red 'next' => green 'next' => yellow 'next' => red; [red yellow green] ~> off -> red;`;
Tl4WAWHA.set_hook({ from: 'red', to: 'green', name: 'next', handler: () => true, kind: 'named' });

function ActionCycleTLWithNamedHooks100Times() {

  for (let i=0; i<100; ++i) {
    Tl4WAWHA.action('next');  // to green
    Tl4WAWHA.action('next');  // to yellow
    Tl4WAWHA.action('next');  // to red
  }

}






const Tl4AA = sm`red 'next' => green 'next' => yellow 'next' => red; [red yellow green] ~> off -> red;`;
Tl4AA.set_hook({ handler: () => true, kind: 'any action' });

function AnyActionCycleTLWithNamedHooks100Times() {

  for (let i=0; i<100; ++i) {
    Tl4AA.action('next');  // to green
    Tl4AA.action('next');  // to yellow
    Tl4AA.action('next');  // to red
  }

}






const Tl4TAA = sm`red 'next' => green 'next' => yellow 'next' => red; [red yellow green] ~> off -> red;`;
Tl4TAA.set_hook({ handler: () => true, kind: 'any transition' });

function ActionCycleTLWithAnyTransitionHooks100Times() {

  for (let i=0; i<100; ++i) {
    Tl4TAA.action('next');  // to green
    Tl4TAA.action('next');  // to yellow
    Tl4TAA.action('next');  // to red
  }

}





const Tl4EXA = sm`red 'next' => green 'next' => yellow 'next' => red; [red yellow green] ~> off -> red;`;
Tl4EXA.set_hook({ handler: () => true, from: 'red', kind: 'exit' });

function ActionCycleTLWithExitHooks100Times() {

  for (let i=0; i<100; ++i) {
    Tl4EXA.action('next');  // to green
    Tl4EXA.action('next');  // to yellow
    Tl4EXA.action('next');  // to red
  }

}





const Tl4ENA = sm`red 'next' => green 'next' => yellow 'next' => red; [red yellow green] ~> off -> red;`;
Tl4ENA.set_hook({ handler: () => true, to: 'red', kind: 'entry' });

function ActionCycleTLWithEnterHooks100Times() {

  for (let i=0; i<100; ++i) {
    Tl4ENA.action('next');  // to green
    Tl4ENA.action('next');  // to yellow
    Tl4ENA.action('next');  // to red
  }

}





const Tl4STA = sm`red -> green -> yellow -> red; [red yellow green] ~> off -> red;`;
Tl4STA.set_hook({ handler: () => true, kind: 'standard transition' });

function ActionCycleTLWithSTHooks100Times() {

  for (let i=0; i<100; ++i) {
    Tl4STA.action('next');  // to green
    Tl4STA.action('next');  // to yellow
    Tl4STA.action('next');  // to red
  }

}






const Tl4MTA = sm`red => green => yellow => red; [red yellow green] ~> off -> red;`;
Tl4MTA.set_hook({ handler: () => true, kind: 'main transition' });

function ActionCycleTLWithMTHooks100Times() {

  for (let i=0; i<100; ++i) {
    Tl4MTA.action('next');  // to green
    Tl4MTA.action('next');  // to yellow
    Tl4MTA.action('next');  // to red
  }

}






const Tl4FTA = sm`red ~> green ~> yellow ~> red; [red yellow green] ~> off -> red;`;
Tl4FTA.set_hook({ handler: () => true, kind: 'forced transition' });

function ActionCycleTLWithFTHooks100Times() {

  for (let i=0; i<100; ++i) {
    Tl4FTA.action('next');  // to green
    Tl4FTA.action('next');  // to yellow
    Tl4FTA.action('next');  // to red
  }

}






const Tl4GA = sm`red 'next' => green 'next' => yellow 'next' => red; [red yellow green] ~> off -> red;`;
Tl4GA.set_hook({ handler: () => true, kind: 'global action' });

function GlobalActionCycleTLWithNamedHooks100Times() {

  for (let i=0; i<100; ++i) {
    Tl4GA.action('next');  // to green
    Tl4GA.action('next');  // to yellow
    Tl4GA.action('next');  // to red
  }

}






const Tl4KS = sm`red 'next' => green 'next' -> yellow 'next' ~> red; [red yellow green] ~> off -> red;`;

Tl4KS.set_hook({ from: 'red', to: 'green', handler: () => true, kind: 'hook' });
Tl4KS.set_hook({ from: 'red', to: 'green', name: 'next', handler: () => true, kind: 'named' });
Tl4KS.set_hook({ from: 'red', to: 'green', name: 'unused', handler: () => true, kind: 'named' });
Tl4KS.set_hook({ handler: () => true, kind: 'any transition' });
Tl4KS.set_hook({ handler: () => true, from: 'red', kind: 'exit' });
Tl4KS.set_hook({ handler: () => true, kind: 'any action' });
Tl4KS.set_hook({ handler: () => true, kind: 'any transition' });
Tl4KS.set_hook({ handler: () => true, kind: 'standard transition' });
Tl4KS.set_hook({ handler: () => true, kind: 'main transition' });
Tl4KS.set_hook({ handler: () => true, kind: 'forced transition' });
Tl4KS.set_hook({ handler: () => true, kind: 'global action' });
Tl4KS.set_hook({ handler: () => true, to: 'red', kind: 'entry' });
Tl4KS.set_hook({ handler: () => true, to: 'red', kind: 'standard transition' });
Tl4KS.set_hook({ handler: () => true, to: 'red', kind: 'main transition' });
Tl4KS.set_hook({ handler: () => true, to: 'red', kind: 'forced transition' });

function KitchenSink100Times() {

  for (let i=0; i<100; ++i) {
    Tl4GA.transition('green');
    Tl4GA.action('next');           // to yellow
    Tl4GA.force_transition('red');
  }

}





b.suite('General performance suite',

  b.add('Blind cycle a traffic light 100 times by transition',                 TransitionCycleTL100Times                       ),
  b.add('Blind cycle a traffic light 100 times by action',                     ActionCycleTL100Times                           ),
  b.add('Blind cycle a basic-hooked traffic light 100 times by transition',    TransitionCycleTLWithHooks100Times              ),
  b.add('Blind cycle a named-hooked traffic light 100 times by transition',    TransitionCycleTLWithNamedHooks100Times         ),
  b.add('Blind cycle an any-transition traffic light 100 times by transition', TransitionCycleTLWithAnyTransitionHooks100Times ),
  b.add('Blind cycle an exit hooked traffic light 100 times by transition',    TransitionCycleTLWithExitHooks100Times          ),
  b.add('Blind cycle an enter hooked traffic light 100 times by transition',   TransitionCycleTLWithEnterHooks100Times         ),
  b.add('Blind cycle a standard-transition hooked light by transition',        TransitionCycleTLWithSTHooks100Times            ),
  b.add('Blind cycle a main-transition hooked light by transition',            TransitionCycleTLWithMTHooks100Times            ),
  b.add('Blind cycle a force-transition hooked light by transition',           TransitionCycleTLWithFTHooks100Times            ),
  b.add('Blind cycle a traffic light 100 times by action',                     ActionCycleTL100Times                           ),
  b.add('Blind cycle a basic-hooked traffic light 100 times by action',        ActionCycleTLWithHooks100Times                  ),
  b.add('Blind cycle a named-hooked traffic light 100 times by action',        ActionCycleTLWithNamedHooks100Times             ),
  b.add('Blind cycle an any-action traffic light 100 times by action',         AnyActionCycleTLWithNamedHooks100Times          ),
  b.add('Blind cycle a global-action traffic light 100 times by action',       GlobalActionCycleTLWithNamedHooks100Times       ),
  b.add('Blind cycle an exit hooked traffic light 100 times by action',        ActionCycleTLWithExitHooks100Times              ),
  b.add('Blind cycle an enter hooked traffic light 100 times by action',       ActionCycleTLWithEnterHooks100Times             ),
  b.add('Blind cycle a standard transition tl 100 times by action',            ActionCycleTLWithSTHooks100Times                ),
  b.add('Blind cycle a main transition tl 100 times by action',                ActionCycleTLWithMTHooks100Times                ),
  b.add('Blind cycle a forced transition tl 100 times by action',              ActionCycleTLWithFTHooks100Times                ),
  b.add('Kitchen Sink 100 times',                                              KitchenSink100Times                             ),

  b.cycle(),
  b.complete(),

  b.save({ file: 'general', version: '1.2.0' }),
  b.save({ file: 'general', format: 'chart.html' }),

);
