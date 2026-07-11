
import { JssmArrow, JssmArrowDirection, JssmArrowKind } from './jssm_types.js';
import { JssmError }                                    from './jssm_error.js';





 

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

function arrow_direction(arrow: JssmArrow): JssmArrowDirection {

  switch (arrow as string) {

    case '->': case '→':
    case '=>': case '⇒':
    case '~>': case '↛': {
      return 'right';
 }

    case '<-': case '←':
    case '<=': case '⇐':
    case '<~': case '↚': {
      return 'left';
 }

    case '<->': case '↔':
    case '<-=>': case '←⇒': case '←=>': case '<-⇒':
    case '<-~>': case '←↛': case '←~>': case '<-↛':

    case '<=>': case '⇔':
    case '<=->': case '⇐→': case '⇐->': case '<=→':
    case '<=~>': case '⇐↛': case '⇐~>': case '<=↛':

    case '<~>': case '↮':
    case '<~->': case '↚→': case '↚->': case '<~→':
    case '<~=>': case '↚⇒': case '↚=>': case '<~⇒': {
      return 'both';
 }

    default: {
      throw new JssmError(undefined, `arrow_direction: unknown arrow type ${arrow}`);
    }

  }

}

 





 

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

function arrow_left_kind(arrow: JssmArrow): JssmArrowKind {

  switch (arrow as string) {

    case '->': case '→':
    case '=>': case '⇒':
    case '~>': case '↛': {
      return 'none';
 }

    case '<-': case '←':
    case '<->': case '↔':
    case '<-=>': case '←⇒': case '←=>': case '<-⇒':
    case '<-~>': case '←↛': case '←~>': case '<-↛': {
      return 'legal';
 }

    case '<=': case '⇐':
    case '<=>': case '⇔':
    case '<=->': case '⇐→': case '⇐->': case '<=→':
    case '<=~>': case '⇐↛': case '⇐~>': case '<=↛': {
      return 'main';
 }

    case '<~': case '↚':
    case '<~>': case '↮':
    case '<~->': case '↚→': case '↚->': case '<~→':
    case '<~=>': case '↚⇒': case '↚=>': case '<~⇒': {
      return 'forced';
 }

    default: {
      throw new JssmError(undefined, `arrow_direction: unknown arrow type ${arrow}`);
    }

  }

}

 





 

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

function arrow_right_kind(arrow: JssmArrow): JssmArrowKind {

  switch (arrow as string) {

    case '<-': case '←':
    case '<=': case '⇐':
    case '<~': case '↚': {
      return 'none';
 }

    case '->': case '→':
    case '<->': case '↔':
    case '<=->': case '⇐→': case '⇐->': case '<=→':
    case '<~->': case '↚→': case '↚->': case '<~→': {
      return 'legal';
 }

    case '=>': case '⇒':
    case '<=>': case '⇔':
    case '<-=>': case '←⇒': case '←=>': case '<-⇒':
    case '<~=>': case '↚⇒': case '↚=>': case '<~⇒': {
      return 'main';
 }

    case '~>': case '↛':
    case '<~>': case '↮':
    case '<-~>': case '←↛': case '←~>': case '<-↛':
    case '<=~>': case '⇐↛': case '⇐~>': case '<=↛': {
      return 'forced';
 }

    default: {
      throw new JssmError(undefined, `arrow_direction: unknown arrow type ${arrow}`);
    }

  }

}

 





export {

  arrow_direction,
    arrow_left_kind,
    arrow_right_kind

};
