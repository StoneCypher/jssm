
const b    = require('benny'),
      jssm = require('../../dist/jssm.es5.cjs'),
      sm   = jssm.sm;





const Tl4 = sm`red => green => yellow => red; [red yellow green] ~> off -> red;`;

function TransitionCycleFourPointTrafficLight500Times() {

  for (let i=0; i<500; ++i) {
    Tl4.transition('green');
    Tl4.transition('yellow');
    Tl4.transition('red');
  }

}





const Tl4WH = sm`red => green => yellow => red; [red yellow green] ~> off -> red;`;
Tl4WH.set_hook({ from: 'red', to: 'green', handler: () => true, kind: 'hook' });

function TransitionCycleFourPointTrafficLightWithHooks500Times() {

  for (let i=0; i<500; ++i) {
    Tl4WH.transition('green');
    Tl4WH.transition('yellow');
    Tl4WH.transition('red');
  }

}





const Tl4WA = sm`red 'next' => green 'next' => yellow 'next' => red; [red yellow green] ~> off -> red;`;

function ActionCycleFourPointTrafficLight500Times() {

  for (let i=0; i<500; ++i) {
    Tl4WA.action('next');  // to green
    Tl4WA.action('next');  // to yellow
    Tl4WA.action('next');  // to red
  }

}






const Tl4WAWH = sm`red 'next' => green 'next' => yellow 'next' => red; [red yellow green] ~> off -> red;`;
Tl4WAWH.set_hook({ from: 'red', to: 'green', handler: () => true, kind: 'hook' });

function ActionCycleFourPointTrafficLightWithHooks500Times() {

  for (let i=0; i<500; ++i) {
    Tl4WAWH.action('next');  // to green
    Tl4WAWH.action('next');  // to yellow
    Tl4WAWH.action('next');  // to red
  }

}





b.suite('General performance suite',

  b.add('Blind cycle a traffic light 500 times by transition',        TransitionCycleFourPointTrafficLight500Times          ),
  b.add('Blind cycle a hooked traffic light 500 times by transition', TransitionCycleFourPointTrafficLightWithHooks500Times ),
  b.add('Blind cycle a traffic light 500 times by action',            ActionCycleFourPointTrafficLight500Times              ),
  b.add('Blind cycle a hooked traffic light 500 times by action',     ActionCycleFourPointTrafficLightWithHooks500Times     ),

  b.cycle(),
  b.complete(),

  b.save({ file: 'general', version: '1.0.0' }),
  b.save({ file: 'general', format: 'chart.html' }),

);
