import { JssmArrow, JssmArrowDirection, JssmArrowKind } from './jssm_types.js';
/*********
 *
 *  Return the direction of an arrow - `right`, `left`, or `both`.
 *
 *  ```typescript
 *  import { arrow_direction } from 'jssm';
 *
 *  arrow_direction('->');    // 'right'
 *  arrow_direction('<~=>');  // 'both'
 *  ```
 *
 *  @param arrow The arrow to be evaluated
 *
 */
declare function arrow_direction(arrow: JssmArrow): JssmArrowDirection;
/*********
 *
 *  Return the direction of an arrow - `right`, `left`, or `both`.
 *
 *  ```typescript
 *  import { arrow_left_kind } from 'jssm';
 *
 *  arrow_left_kind('<-');    // 'legal'
 *  arrow_left_kind('<=');    // 'main'
 *  arrow_left_kind('<~');    // 'forced'
 *  arrow_left_kind('<->');   // 'legal'
 *  arrow_left_kind('->');    // 'none'
 *  ```
 *
 *  @param arrow The arrow to be evaluated
 *
 */
declare function arrow_left_kind(arrow: JssmArrow): JssmArrowKind;
/*********
 *
 *  Return the direction of an arrow - `right`, `left`, or `both`.
 *
 *  ```typescript
 *  import { arrow_left_kind } from 'jssm';
 *
 *  arrow_left_kind('->');    // 'legal'
 *  arrow_left_kind('=>');    // 'main'
 *  arrow_left_kind('~>');    // 'forced'
 *  arrow_left_kind('<->');   // 'legal'
 *  arrow_left_kind('<-');    // 'none'
 *  ```
 *
 *  @param arrow The arrow to be evaluated
 *
 */
declare function arrow_right_kind(arrow: JssmArrow): JssmArrowKind;
export { arrow_direction, arrow_left_kind, arrow_right_kind };
