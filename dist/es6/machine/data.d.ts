/*******
 *
 *  The data family: the machine's free-form data value, its declared
 *  `property` table, and its typed `val` table.  Every function takes the
 *  machine as its first argument and reads the machine's `_data`,
 *  `_state_properties` / `_default_properties` / `_property_keys`, and
 *  `_val_*` fields directly; the `Machine` class methods of the same names
 *  are one-line delegates onto these.
 *
 *  `data`, `set_data`, `prop`, `strict_prop`, `props`, `known_prop`,
 *  `known_props`, `val`, `set_val`, `vals`, `known_val`, `known_vals`, and
 *  `val_type` are the public surface, re-exported by the `jssm` barrel.
 *  `data_ref` (the zero-copy read the class exposes as `_data_ref`) and
 *  `validate_val_value` (which the constructor runs over the initial vals)
 *  are exported for the class and the same-package panels only, and are not
 *  part of the barrel.
 *
 */
import type { Machine } from './machine.js';
import type { JssmValType } from '../jssm_types.js';
/*********
 *
 *  Validate a candidate `value` against a val's declared `JssmValType`, throwing
 *  a {@link JssmError} on a type or range violation.  Used both at construction
 *  (initial values) and on every `set_val` write.
 *
 *  @param name    The val's declared name, for the error message.
 *  @param vtype   The val's declared type descriptor.
 *  @param value   The candidate value.
 *  @param machine The machine the error should be attributed to.
 *
 *  @throws {JssmError} If `value` is not of the declared kind, or an `int`
 *  outside its declared `lo..hi` range, or a string outside an `enum`'s members.
 *
 */
export declare function validate_val_value(name: string, vtype: JssmValType, value: any, machine: any): void;
/*********
 *
 *  Get the current data of a machine.
 *
 *  @example
 *  import { from, data } from 'jssm';
 *
 *  const lswitch = from('on <=> off;', {data: 1});
 *  data(lswitch);              // => 1
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m The machine whose data to read.
 *
 *  @returns A deep clone of the machine's current data value.
 *
 */
export declare function data<mDT>(m: Machine<mDT>): mDT;
/*********
 *
 *  Replace the machine's data in place, without a transition.  This is the
 *  practical way to assign any value — including `undefined`, `null`, or
 *  `false` — outside a hook's complex return, closing the gap where an
 *  `undefined` assignment had no direct API (StoneCypher/fsl#1264).  Fires
 *  a `data-change` event with cause `'set_data'` when the value actually
 *  changes; unlike {@link override} it requires no `allows_override`
 *  config, because it never moves the state.
 *
 *  @example
 *  import { from, data, set_data } from 'jssm';
 *
 *  const lswitch = from('on <=> off;', {data: 1});
 *  data(lswitch);              // => 1
 *
 *  set_data(lswitch, 2);
 *  data(lswitch);              // => 2
 *
 *  set_data(lswitch, undefined);
 *  data(lswitch);              // => undefined
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m       The machine whose data to replace.
 *  @param newData The value to install as the machine's data.
 *
 *  @returns The machine, for chaining.
 *
 *  @see data
 *  @see override
 *
 */
export declare function set_data<mDT>(m: Machine<mDT>, newData: mDT): Machine<mDT>;
/**
 *  The machine's current data by REFERENCE — no clone.  The public
 *  {@link data} contract is a deep clone per call (a mutation boundary for
 *  external consumers, and deliberately untouched); that clone is
 *  `structuredClone` of the whole data value, which same-package read-only
 *  consumers — the fsl-bind and fsl-data-inspector panels, which read one
 *  dotted path or serialize per transition — should not pay on every event.
 *  Callers MUST NOT mutate the returned value or store it beyond the current
 *  tick; anything crossing a trust boundary must use {@link data} instead.
 *  The class exposes this as `_data_ref()`; it is not part of the barrel.
 *
 *  Not a doctest: `data_ref` is module-only and cannot be imported from `'jssm'`.
 *  ```typescript
 *  import { from } from 'jssm';
 *  import { data_ref } from './machine/data.js';   // same-package import; not on the barrel
 *
 *  const m = from('on <=> off;', { data: { a: { b: 1 } } });
 *  data_ref(m).a.b;   // 1, zero-copy
 *  ```
 *  @param m The machine whose data to read.
 *  @returns The live data value; treat as read-only.
 *  @see data
 *  @internal
 */
export declare function data_ref<mDT>(m: Machine<mDT>): mDT;
/*********
 *
 *  Get the current value of a given property name.  Checks the current
 *  state's properties first, then falls back to the global default.
 *  Returns `undefined` if neither exists.  For a throwing variant, see
 *  {@link strict_prop}.
 *
 *  @example
 *  import { sm, go, prop } from 'jssm';
 *
 *  const m = sm`property color default "grey"; a -> b;
 *               state b: { property: color "blue"; };`;
 *
 *  // the default, because the state is 'a':
 *  prop(m, 'color');  // => 'grey'
 *  go(m, 'b');
 *  // state 'b' overrides the default:
 *  prop(m, 'color');  // => 'blue'
 *  // no such property:
 *  prop(m, 'size');   // => undefined
 *
 *  @param m    The machine to read the property from.
 *  @param name The relevant property name to look up.
 *
 *  @returns The value behind the prop name, or `undefined` if not defined.
 *
 */
export declare function prop<mDT>(m: Machine<mDT>, name: string): any;
/*********
 *
 *  Get the current value of a given property name.  If missing on the state
 *  and without a global default, throws a {@link JssmError}, unlike
 *  {@link prop}, which would return `undefined` instead.
 *
 *  @example
 *  import { sm, strict_prop } from 'jssm';
 *
 *  const m = sm`property color default "grey"; a -> b;`;
 *
 *  strict_prop(m, 'color');  // => 'grey'
 *  // an undeclared property throws a JssmError:
 *  expect(() => strict_prop(m, 'size')).toThrow();
 *
 *  @param m    The machine to read the property from.
 *  @param name The relevant property name to look up.
 *
 *  @returns The value behind the prop name.
 *
 *  @throws {JssmError} If the property is not defined on the current state
 *  and has no default.
 *
 */
export declare function strict_prop<mDT>(m: Machine<mDT>, name: string): any;
/*********
 *
 *  Get the current value of every prop, as an object.  If no current definition
 *  exists for a prop — that is, if the prop was defined without a default and
 *  the current state also doesn't define the prop — then that prop will be listed
 *  in the returned object with a value of `undefined`.
 *
 *  @example
 *  import { sm, go, state, props } from 'jssm';
 *
 *  const traffic_light = sm`
 *
 *    property can_go     default true;
 *    property hesitate   default true;
 *    property stop_first default false;
 *
 *    Off -> Red => Green => Yellow => Red;
 *    [Red Yellow Green] ~> [Off FlashingRed];
 *    FlashingRed -> Red;
 *
 *    state Red:         { property: stop_first true;  property: can_go false; };
 *    state Off:         { property: stop_first true;  };
 *    state FlashingRed: { property: stop_first true;  };
 *    state Green:       { property: hesitate   false; };
 *
 *  `;
 *
 *  state(traffic_light);  // => 'Off'
 *  props(traffic_light);  // => { can_go: true,  hesitate: true,  stop_first: true  }
 *
 *  go(traffic_light, 'Red');
 *  props(traffic_light);  // => { can_go: false, hesitate: true,  stop_first: true  }
 *
 *  go(traffic_light, 'Green');
 *  props(traffic_light);  // => { can_go: true,  hesitate: false, stop_first: false }
 *
 *  @param m The machine to read the properties from.
 *
 *  @returns An object mapping every known property name to its current value
 *  (or `undefined` if the property has no default and the current state
 *  doesn't define it).
 *
 */
export declare function props<mDT>(m: Machine<mDT>): object;
/*********
 *
 *  Check whether a given string is a known property's name.
 *
 *  @example
 *  import { sm, known_prop } from 'jssm';
 *
 *  const example = sm`property foo default 1; a->b;`;
 *
 *  known_prop(example, 'foo');  // => true
 *  known_prop(example, 'bar');  // => false
 *
 *  @param m         The machine to inspect.
 *  @param prop_name The relevant property name to look up
 *
 *  @returns Whether the name is a declared property.
 *
 */
export declare function known_prop<mDT>(m: Machine<mDT>, prop_name: string): boolean;
/*********
 *
 *  List all known property names.  If you'd also like values, use
 *  {@link props} instead.  The order of the properties is not defined, and
 *  the properties generally will not be sorted.
 *
 *  @example
 *  import { sm, known_props } from 'jssm';
 *
 *  const m = sm`property color default "grey"; property size default 1; a -> b;`;
 *
 *  known_props(m).sort();  // => ['color', 'size']
 *
 *  @param m The machine to inspect.
 *
 *  @returns An array of all property name strings defined on this machine.
 *
 */
export declare function known_props<mDT>(m: Machine<mDT>): string[];
/*********
 *
 *  Read the current value of a declared machine `val`.
 *
 *  @example
 *  import { sm, val } from 'jssm';
 *
 *  const m = sm`val ok : boolean default true; a -> b;`;
 *
 *  val(m, 'ok');   // => true
 *
 *  @param m    The machine to read the val from.
 *  @param name The declared val name to read.
 *  @returns The val's current value (or `undefined` if it has no default and was not supplied).
 *  @throws {JssmError} If `name` is not a declared val.
 *
 */
export declare function val<mDT>(m: Machine<mDT>, name: string): any;
/*********
 *
 *  Set the value of a declared machine `val`, validating it against the val's
 *  declared type.  This is the runtime mutation surface; source-level `assign`
 *  arrives in a later phase.
 *
 *  @example
 *  import { sm, val, set_val } from 'jssm';
 *
 *  const m = sm`val n : int default 0; a -> b;`;
 *
 *  set_val(m, 'n', 5);
 *  val(m, 'n');   // => 5
 *
 *  @param m     The machine to write the val on.
 *  @param name  The declared val name to write.
 *  @param value The new value; must satisfy the val's declared type.
 *  @throws {JssmError} If `name` is not a declared val, or `value` violates the type.
 *
 */
export declare function set_val<mDT>(m: Machine<mDT>, name: string, value: any): void;
/*********
 *
 *  Return a plain object mapping every declared val name to its current value.
 *
 *  @example
 *  import { sm, vals } from 'jssm';
 *
 *  const m = sm`val a : int default 1; val b : boolean default false; x -> y;`;
 *
 *  vals(m);   // => { a: 1, b: false }
 *
 *  @param m The machine to read the vals from.
 *
 *  @returns An object of every declared val name to its current value.
 *
 */
export declare function vals<mDT>(m: Machine<mDT>): object;
/*********
 *
 *  Check whether a string is the name of a declared `val`.
 *
 *  @example
 *  import { sm, known_val } from 'jssm';
 *
 *  const m = sm`val a : int default 1; x -> y;`;
 *
 *  known_val(m, 'a');   // => true
 *  known_val(m, 'z');   // => false
 *
 *  @param m    The machine to inspect.
 *  @param name The candidate val name.
 *  @returns Whether the name is a declared val.
 *
 */
export declare function known_val<mDT>(m: Machine<mDT>, name: string): boolean;
/*********
 *
 *  List every declared `val` name, in declaration order.
 *
 *  @example
 *  import { sm, known_vals } from 'jssm';
 *
 *  const m = sm`val a : int default 1; val b : int default 2; x -> y;`;
 *
 *  known_vals(m);   // => ['a', 'b']
 *
 *  @param m The machine to inspect.
 *
 *  @returns The declared val names in declaration order.
 *
 */
export declare function known_vals<mDT>(m: Machine<mDT>): string[];
/*********
 *
 *  Return the declared type descriptor of a `val`.
 *
 *  @example
 *  import { sm, val_type } from 'jssm';
 *
 *  const m = sm`val n : int 0..3 default 0; x -> y;`;
 *
 *  val_type(m, 'n');   // => { kind: 'int', lo: 0, hi: 3 }
 *
 *  @param m    The machine to inspect.
 *  @param name The declared val name.
 *  @returns The val's declared type descriptor.
 *  @throws {JssmError} If `name` is not a declared val.
 *
 */
export declare function val_type<mDT>(m: Machine<mDT>, name: string): JssmValType;
