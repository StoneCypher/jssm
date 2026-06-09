# FSL `var` Extended State — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a machine-level `var` declaration — a *named, typed, validated, mutable* extended-state variable (the mutable sibling of `property`) — for the scalar type core (`boolean`, `int`, bounded `int lo..hi`, `string`, `enum(...)`), with construction-time type validation and a typed runtime mutation API. **No** expression evaluation, `assign`, `where`, or source-level mutation yet — those are Phase 2.

**Architecture:** Mirror the existing `property` pipeline end-to-end (grammar → compiler → runtime storage/validation → accessors), adding a parallel `var` track. The one genuinely new piece versus `property` is a **type descriptor** (`JssmVarType`) carried from grammar to runtime, and a **`validate_var_value`** function that enforces it both at construction and on every write. Initial values resolve as: supplied `vars` config option > declared `default` > (required → throw) > `undefined`.

**Tech Stack:** TypeScript 4.7; PEG.js 0.10 grammar (`src/ts/fsl_parser.peg` → generated `src/ts/fsl_parser.ts` via `npm run peg`); Vitest (spec config `vitest.spec.config.ts`, stoch config `vitest.stoch.config.ts`); fast-check for stochastic tests.

---

## Project rules that constrain this plan (read before starting)

- **No compound commands.** Never join shell commands with `&&`, `||`, `;`, or `|`. Every "Commit" step below lists `git add` and `git commit` as **separate** commands — run them separately. (npm scripts that contain `&&` internally are fine; only *your* invocations must be single commands.)
- **`git` verb-first.** Never put an option between `git` and its subcommand (no `git -C ...`). To act in another directory, `cd` there as its own command first.
- **Do not bump the version during tasks.** The version bump + full build happen once via `/sc-commit` on this branch *before* the PR. Per-task commits are plain `git commit` (no version change).
- **100% spec coverage gate.** `vitest-spec` requires 100% line/branch coverage over `src/ts/**` (excluding the generated `fsl_parser`). Every branch you add to `jssm.ts` / `jssm_compiler.ts` **must** be exercised by `vars.spec.ts`. **Do not write unreachable branches** (e.g. a `default:` case on an exhaustive discriminated union) — they cannot be covered and will fail the gate.
- **No fake tests, no golden/snapshot tests, no bug-pinning.** Tests must validate real parse→construct→accessor behavior. Assert thrown errors and substrings of messages, not whole-object snapshots.
- **Stochastic tests go in `*.stoch.ts`** (Task 10), spec tests in `*.spec.ts`. They report coverage independently — keep them separate.
- **Check IDE diagnostics** (`mcp__ide__getDiagnostics`) after editing `.ts` files, before considering a task done.
- **Worktree:** all work happens in `…/projects/worktrees/stonecypher_jssm_feat_26-06-09_fsl-expression-language` on branch `feat_26-06-09_fsl-expression-language`. Keep it OUTSIDE the repo tree (never nest a worktree under the repo — it double-loads TypeDoc and breaks the build).

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `src/ts/fsl_parser.peg` | Grammar: the `MachineVar` rule + `VarType` / `VarVal` sub-rules; wire `MachineVar` into the `Term` alternation. | Modify |
| `src/ts/fsl_parser.ts` | **Generated** from the `.peg` by `npm run peg`. Never hand-edit. | Regenerated |
| `src/ts/jssm_types.ts` | `JssmVarType`, `JssmVarDefinition`; extend `JssmGenericConfig` (`var_definition`, `vars`) and `JssmCompileSeStart` (`var_type`). | Modify |
| `src/ts/jssm_compiler.ts` | Consume the `var_definition` AST node → config; duplicate-name check; assemble into `result_cfg` (conditional, mirroring `property_definition`). | Modify |
| `src/ts/jssm.ts` | Runtime: `_var_keys`/`_var_types`/`_var_values`/`_required_vars`; the construction loop + validation; `validate_var_value`; accessors `var`/`vars`/`set_var`/`known_var`/`known_vars`/`var_type`. | Modify |
| `src/ts/tests/vars.spec.ts` | Unit/spec coverage of every var behavior and error path. | Create |
| `src/ts/tests/vars.stoch.ts` | Property-based coverage of grammar shapes + value vocabulary. | Create |

---

## Task 0: Baseline

**Files:** none (setup only)

- [ ] **Step 1: Install and generate sources**

The worktree is a fresh checkout; the generated parser and version files do not exist yet.

Run (each as its own command):
```
npm install
```
```
npm run prep
```
`prep` runs `makever` (writes `src/ts/version.ts`) then `peg` (writes `src/ts/fsl_parser.ts`). Expected: both complete without error.

- [ ] **Step 2: Confirm a green spec baseline**

Run:
```
npm run vitest-spec
```
Expected: all existing spec suites pass. If anything fails before you change a line, stop and report — do not build on a red baseline.

---

## Task 1: Parse, store, and read a `boolean` var with a default (the full vertical slice)

This task wires the entire pipeline for one type, so later tasks only *extend* it.

**Files:**
- Modify: `src/ts/jssm_types.ts`
- Modify: `src/ts/fsl_parser.peg`
- Modify: `src/ts/jssm_compiler.ts`
- Modify: `src/ts/jssm.ts`
- Test: `src/ts/tests/vars.spec.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `src/ts/tests/vars.spec.ts`:
```typescript

import * as jssm from '../jssm';



describe('var: boolean declaration', () => {

  test('declares and reads a boolean var with a default', () => {
    const m = jssm.from('var ok : boolean default true; a -> b;');
    expect( m.var('ok') ).toBe(true);
  });

  test('creating a boolean var does not throw', () => {
    expect( () => jssm.from('var ok : boolean default false; a -> b;') )
      .not.toThrow();
  });

});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```
npx vitest run --config vitest.spec.config.ts src/ts/tests/vars.spec.ts
```
Expected: FAIL — the parser does not recognize `var`, so `jssm.from(...)` throws a parse error.

- [ ] **Step 3: Add the types**

In `src/ts/jssm_types.ts`, immediately after the `JssmPropertyDefinition` type (around line 205), add:
```typescript
type JssmVarType =
  | { kind: 'boolean' }
  | { kind: 'string' }
  | { kind: 'int', lo?: number, hi?: number }
  | { kind: 'enum', members: string[] };

type JssmVarDefinition = {
  name           : string,
  var_type       : JssmVarType,
  default_value? : any,
  required?      : boolean
};
```
Add both to the export list near the bottom (around line 1307, where `JssmPropertyDefinition` is exported):
```typescript
  JssmVarType,
  JssmVarDefinition,
```
In `JssmGenericConfig<StateType, DataType>` (around lines 521–595), beside `property_definition` (≈ line 558), add:
```typescript
  var_definition? : JssmVarDefinition[],
  vars?           : { [name: string]: any },
```
In `JssmCompileSeStart<StateType, DataType>` (around lines 661–671), beside the existing `default_value?`/`required?` fields, add:
```typescript
  var_type? : JssmVarType,
```

- [ ] **Step 4: Add the grammar rules**

In `src/ts/fsl_parser.peg`, after the `MachineProperty` rule (ends ≈ line 1518), add the `MachineVar` rule and its sub-rules:
```
MachineVar
  = WS? "var" WS name:Label WS? ":" WS? vtype:VarType WS "default" WS dval:VarVal WS "required" WS? ";" WS? {
      const node = { key: 'var_definition', name, var_type: vtype, default_value: dval, required: true };
      if (options.locations) { node.loc = location(); }
      return node;
    }
  / WS? "var" WS name:Label WS? ":" WS? vtype:VarType WS "required" WS? ";" WS? {
      const node = { key: 'var_definition', name, var_type: vtype, required: true };
      if (options.locations) { node.loc = location(); }
      return node;
    }
  / WS? "var" WS name:Label WS? ":" WS? vtype:VarType WS "default" WS dval:VarVal WS? ";" WS? {
      const node = { key: 'var_definition', name, var_type: vtype, default_value: dval };
      if (options.locations) { node.loc = location(); }
      return node;
    }
  / WS? "var" WS name:Label WS? ":" WS? vtype:VarType WS? ";" WS? {
      const node = { key: 'var_definition', name, var_type: vtype };
      if (options.locations) { node.loc = location(); }
      return node;
    }

VarType
  = VarTypeInt
  / VarTypeBoolean
  / VarTypeString
  / VarTypeEnum

VarTypeBoolean = "boolean" { return { kind: 'boolean' }; }
VarTypeString  = "string"  { return { kind: 'string' }; }

VarTypeInt
  = "int" range:VarIntRange? {
      return range === null ? { kind: 'int' } : { kind: 'int', lo: range.lo, hi: range.hi };
    }

VarIntRange
  = WS lo:VarSignedInt WS? ".." WS? hi:VarSignedInt { return { lo, hi }; }

VarSignedInt
  = chars:$("-"? [0-9]+) { return parseInt(chars, 10); }

VarTypeEnum
  = "enum" WS? "(" WS? first:Atom rest:(WS? "," WS? m:Atom { return m; })* WS? ")" {
      return { kind: 'enum', members: [first, ...rest] };
    }

VarVal
  = String
  / Boolean
  / JsNumericLiteral
  / Atom
```
Then wire `MachineVar` into the top-level `Term` alternation (≈ lines 1554–1561), as a sibling immediately **after** `MachineProperty` and before `Config`:
```
  / MachineProperty
  / MachineVar
  / Config
```
(`Exp` is tried first in `Term`, so a state literally named `var` — e.g. `var -> b;` — still parses as a transition; `MachineVar` only matches the `var <name> : <type> …` shape.)

- [ ] **Step 5: Regenerate the parser**

Run:
```
npm run peg
```
Expected: regenerates `src/ts/fsl_parser.ts` with no error. (A PEG syntax error here means a typo in Step 4 — fix and re-run.)

- [ ] **Step 6: Handle the AST node in the compiler**

In `src/ts/jssm_compiler.ts`, in `compile_rule_handler` (≈ line 329), immediately after the `property_definition` block (≈ lines 340–353), add:
```typescript
if (rule.key === 'var_definition') {
  const ret: any = { agg_as: 'var_definition', val: { name: rule.name, var_type: rule.var_type } };
  if (rule.hasOwnProperty('default_value')) { ret.val.default_value = rule.default_value; }
  if (rule.hasOwnProperty('required'))      { ret.val.required      = rule.required;      }
  return ret;
}
```
In the `results` accumulator (≈ lines 474–546), beside the `property_definition` field in the type annotation (≈ line 493) add `var_definition: Array<JssmVarDefinition>,` and beside its initializer (≈ line 529) add `var_definition: [],`. Add the `JssmVarDefinition` import to the type imports from `./jssm_types` at the top of the file.
In the multi-key assembly array (≈ line 600, the `[...].map(multiKey => ...)` that copies non-empty `results[k]` into `result_cfg`), add `'var_definition'` to the array so it flows into `result_cfg` only when non-empty (this keeps `make('a->b;')` output unchanged, so `compile.spec.ts` is untouched).

- [ ] **Step 7: Add runtime storage, construction, and the `var` accessor**

In `src/ts/jssm.ts`:

Add the module-level validation helper near `transfer_state_properties` (≈ line 105):
```typescript
function validate_var_value(name: string, vtype: JssmVarType, value: any, machine: any): void {
  switch (vtype.kind) {
    case 'boolean':
      if (typeof value !== 'boolean') {
        throw new JssmError(machine, `var "${name}" expects boolean, got ${JSON.stringify(value)}`);
      }
      break;
    case 'string':
      if (typeof value !== 'string') {
        throw new JssmError(machine, `var "${name}" expects string, got ${JSON.stringify(value)}`);
      }
      break;
    case 'int':
      if (!Number.isInteger(value)) {
        throw new JssmError(machine, `var "${name}" expects an integer, got ${JSON.stringify(value)}`);
      }
      if (vtype.hasOwnProperty('lo') && value < (vtype as { lo: number }).lo) {
        throw new JssmError(machine, `var "${name}" value ${value} is below the minimum ${(vtype as { lo: number }).lo}`);
      }
      if (vtype.hasOwnProperty('hi') && value > (vtype as { hi: number }).hi) {
        throw new JssmError(machine, `var "${name}" value ${value} is above the maximum ${(vtype as { hi: number }).hi}`);
      }
      break;
    case 'enum':
      if (!vtype.members.includes(value)) {
        throw new JssmError(machine, `var "${name}" expects one of [${vtype.members.join(', ')}], got ${JSON.stringify(value)}`);
      }
      break;
  }
}
```
Import `JssmVarType` and `JssmVarDefinition` from `./jssm_types` at the top alongside `JssmPropertyDefinition`.

Add class fields beside `_property_keys` (≈ lines 471–474):
```typescript
  _var_keys      : Set<string>;
  _var_types     : Map<string, JssmVarType>;
  _var_values    : Map<string, any>;
  _required_vars : Set<string>;
```
Destructure `var_definition` and `vars` from the config (≈ line 533, beside `property_definition`).
Initialize the fields beside the `_property_*` inits (≈ line 663):
```typescript
  this._var_keys      = new Set();
  this._var_types     = new Map();
  this._var_values    = new Map();
  this._required_vars = new Set();
```
After the `property_definition` processing loop (≈ line 883), add the var processing + initial-value resolution:
```typescript
  if (Array.isArray(var_definition)) {

    var_definition.forEach(vd => {
      this._var_keys.add(vd.name);
      this._var_types.set(vd.name, vd.var_type);
      if (vd.hasOwnProperty('required') && (vd.required === true)) {
        if (vd.hasOwnProperty('default_value')) {
          throw new JssmError(this, `The var "${vd.name}" is required, but also has a default; these conflict`);
        }
        this._required_vars.add(vd.name);
      }
    });

    const supplied: { [name: string]: any } = (vars && (typeof vars === 'object')) ? vars : {};

    Object.keys(supplied).forEach(name => {
      if (!this._var_keys.has(name)) {
        throw new JssmError(this, `Cannot supply value for undeclared var "${name}"`);
      }
    });

    this._var_keys.forEach(name => {
      const vtype = this._var_types.get(name) as JssmVarType;
      let value: any;
      if (Object.prototype.hasOwnProperty.call(supplied, name)) {
        value = supplied[name];
      } else {
        const vd = var_definition.find(d => d.name === name);
        if (vd && vd.hasOwnProperty('default_value')) {
          value = vd.default_value;
        } else if (this._required_vars.has(name)) {
          throw new JssmError(this, `The var "${name}" is required, but no value was supplied`);
        } else {
          value = undefined;
        }
      }
      if (value !== undefined) {
        validate_var_value(name, vtype, value, this);
      }
      this._var_values.set(name, value);
    });

  }
```
Add the `var` accessor after `known_props()` (≈ line 1337):
```typescript
  /**
   *  Read the current value of a declared machine var.
   *
   *  @example
   *  const m = sm`var ok : boolean default true; a -> b;`;
   *  m.var('ok');   // true
   *
   *  @param name The declared var name to read.
   *  @returns The var's current value (or `undefined` if it has no default and was not supplied).
   *  @throws {JssmError} If `name` is not a declared var.
   */
  var(name: string): any {
    if (!this._var_keys.has(name)) {
      throw new JssmError(this, `No such var "${name}"`);
    }
    return this._var_values.get(name);
  }
```

- [ ] **Step 8: Run the test to verify it passes**

Run:
```
npm run peg
```
```
npx vitest run --config vitest.spec.config.ts src/ts/tests/vars.spec.ts
```
Expected: PASS (both tests). Then check `mcp__ide__getDiagnostics` on the four modified `.ts` files — no new errors/warnings.

- [ ] **Step 9: Confirm no regressions**

Run:
```
npm run vitest-spec
```
Expected: full spec suite still green.

- [ ] **Step 10: Commit** (run as separate commands)
```
git add src/ts/jssm_types.ts src/ts/fsl_parser.peg src/ts/jssm_compiler.ts src/ts/jssm.ts src/ts/tests/vars.spec.ts
```
```
git commit -m "feat(var): parse, store, and read a boolean var with a default"
```

---

## Task 2: `int` (unbounded) vars + construction-time integer validation

**Files:**
- Modify: `src/ts/tests/vars.spec.ts`

(The grammar/runtime already support `int` from Task 1's `VarTypeInt` and `validate_var_value`'s `int` case; this task proves and covers them.)

- [ ] **Step 1: Write the failing tests**

Append to `src/ts/tests/vars.spec.ts`:
```typescript

describe('var: int declaration', () => {

  test('declares and reads an int var', () => {
    const m = jssm.from('var n : int default 7; a -> b;');
    expect( m.var('n') ).toBe(7);
  });

  test('a non-integer default throws', () => {
    expect( () => jssm.from('var n : int default 1.5; a -> b;') )
      .toThrow(/expects an integer/);
  });

  test('an int var with no default reads as undefined', () => {
    const m = jssm.from('var n : int; a -> b;');
    expect( m.var('n') ).toBeUndefined();
  });

});
```

- [ ] **Step 2: Run to verify the new tests pass**

Run:
```
npx vitest run --config vitest.spec.config.ts src/ts/tests/vars.spec.ts
```
Expected: PASS. (If "non-integer default throws" fails, the `int` branch in `validate_var_value` is wrong — fix it in `jssm.ts`.)

- [ ] **Step 3: Commit** (separate commands)
```
git add src/ts/tests/vars.spec.ts
```
```
git commit -m "test(var): cover unbounded int declaration and integer validation"
```

---

## Task 3: bounded `int lo..hi` + range validation

**Files:**
- Modify: `src/ts/tests/vars.spec.ts`

- [ ] **Step 1: Write the failing tests**

Append:
```typescript

describe('var: bounded int', () => {

  test('an in-range default is accepted', () => {
    const m = jssm.from('var n : int 0..3 default 2; a -> b;');
    expect( m.var('n') ).toBe(2);
  });

  test('a below-minimum default throws', () => {
    expect( () => jssm.from('var n : int 0..3 default -1; a -> b;') )
      .toThrow(/below the minimum 0/);
  });

  test('an above-maximum default throws', () => {
    expect( () => jssm.from('var n : int 0..3 default 9; a -> b;') )
      .toThrow(/above the maximum 3/);
  });

  test('negative bounds parse and validate', () => {
    const m = jssm.from('var n : int -5..-1 default -3; a -> b;');
    expect( m.var('n') ).toBe(-3);
  });

});
```

- [ ] **Step 2: Run to verify**

Run:
```
npx vitest run --config vitest.spec.config.ts src/ts/tests/vars.spec.ts
```
Expected: PASS. (If the bounded forms fail to parse, re-check `VarTypeInt`/`VarIntRange`/`VarSignedInt` in the grammar and that `npm run peg` ran.)

- [ ] **Step 3: Commit** (separate commands)
```
git add src/ts/tests/vars.spec.ts
```
```
git commit -m "test(var): cover bounded int range validation"
```

---

## Task 4: `string` vars

**Files:**
- Modify: `src/ts/tests/vars.spec.ts`

- [ ] **Step 1: Write the failing tests**

Append:
```typescript

describe('var: string declaration', () => {

  test('declares and reads a string var', () => {
    const m = jssm.from('var note : string default "hello"; a -> b;');
    expect( m.var('note') ).toBe('hello');
  });

  test('a numeric default for a string var throws', () => {
    expect( () => jssm.from('var note : string default 5; a -> b;') )
      .toThrow(/expects string/);
  });

});
```

- [ ] **Step 2: Run to verify**

Run:
```
npx vitest run --config vitest.spec.config.ts src/ts/tests/vars.spec.ts
```
Expected: PASS.

- [ ] **Step 3: Commit** (separate commands)
```
git add src/ts/tests/vars.spec.ts
```
```
git commit -m "test(var): cover string declaration and validation"
```

---

## Task 5: `enum(...)` vars + member validation

**Files:**
- Modify: `src/ts/tests/vars.spec.ts`

- [ ] **Step 1: Write the failing tests**

Append:
```typescript

describe('var: enum declaration', () => {

  test('declares and reads an enum var', () => {
    const m = jssm.from('var tier : enum(free, pro, enterprise) default pro; a -> b;');
    expect( m.var('tier') ).toBe('pro');
  });

  test('a default outside the enum members throws', () => {
    expect( () => jssm.from('var tier : enum(free, pro) default gold; a -> b;') )
      .toThrow(/expects one of/);
  });

});
```

- [ ] **Step 2: Run to verify**

Run:
```
npx vitest run --config vitest.spec.config.ts src/ts/tests/vars.spec.ts
```
Expected: PASS.

- [ ] **Step 3: Commit** (separate commands)
```
git add src/ts/tests/vars.spec.ts
```
```
git commit -m "test(var): cover enum declaration and member validation"
```

---

## Task 6: `required`, the `vars` constructor option, and the required/default conflict

**Files:**
- Test: `src/ts/tests/vars.spec.ts`

(Runtime already implements these in Task 1's construction loop; this task proves and covers every branch.)

- [ ] **Step 1: Write the failing tests**

Append:
```typescript

describe('var: required and supplied values', () => {

  test('a required var supplied via the vars option is accepted', () => {
    const m = jssm.from('var tier : enum(free, pro) required; a -> b;', { vars: { tier: 'pro' } });
    expect( m.var('tier') ).toBe('pro');
  });

  test('a required var with no supplied value throws', () => {
    expect( () => jssm.from('var tier : enum(free, pro) required; a -> b;') )
      .toThrow(/is required, but no value was supplied/);
  });

  test('declaring required and default together throws', () => {
    expect( () => jssm.from('var n : int default 0 required; a -> b;') )
      .toThrow(/required, but also has a default/);
  });

  test('supplying a value for an undeclared var throws', () => {
    expect( () => jssm.from('var n : int default 0; a -> b;', { vars: { nope: 1 } }) )
      .toThrow(/undeclared var "nope"/);
  });

  test('a supplied value is type-validated', () => {
    expect( () => jssm.from('var n : int 0..3 required; a -> b;', { vars: { n: 99 } }) )
      .toThrow(/above the maximum 3/);
  });

  test('a supplied value overrides the default', () => {
    const m = jssm.from('var n : int default 1; a -> b;', { vars: { n: 2 } });
    expect( m.var('n') ).toBe(2);
  });

});
```

- [ ] **Step 2: Run to verify**

Run:
```
npx vitest run --config vitest.spec.config.ts src/ts/tests/vars.spec.ts
```
Expected: PASS. These tests exercise the supplied-override branch, the default branch, the required-throw branch, the conflict-throw branch, the undeclared-supplied-throw branch, and the supplied-value validation branch — together covering the construction loop.

- [ ] **Step 3: Commit** (separate commands)
```
git add src/ts/tests/vars.spec.ts
```
```
git commit -m "test(var): cover required vars, the vars option, and conflicts"
```

---

## Task 7: typed runtime mutation — `set_var`

**Files:**
- Modify: `src/ts/jssm.ts`
- Test: `src/ts/tests/vars.spec.ts`

- [ ] **Step 1: Write the failing tests**

Append:
```typescript

describe('var: set_var mutation', () => {

  test('set_var updates the current value', () => {
    const m = jssm.from('var n : int default 0; a -> b;');
    m.set_var('n', 5);
    expect( m.var('n') ).toBe(5);
  });

  test('set_var type-validates the new value', () => {
    const m = jssm.from('var n : int 0..3 default 0; a -> b;');
    expect( () => m.set_var('n', 7) ).toThrow(/above the maximum 3/);
  });

  test('set_var on an unknown var throws', () => {
    const m = jssm.from('var n : int default 0; a -> b;');
    expect( () => m.set_var('ghost', 1) ).toThrow(/No such var "ghost"/);
  });

});
```

- [ ] **Step 2: Run to verify it fails**

Run:
```
npx vitest run --config vitest.spec.config.ts src/ts/tests/vars.spec.ts
```
Expected: FAIL — `set_var` is not defined.

- [ ] **Step 3: Implement `set_var`**

In `src/ts/jssm.ts`, after the `var` accessor added in Task 1, add:
```typescript
  /**
   *  Set the value of a declared machine var, validating it against the var's
   *  declared type.  This is the runtime mutation surface; source-level `assign`
   *  arrives in a later phase.
   *
   *  @example
   *  const m = sm`var n : int default 0; a -> b;`;
   *  m.set_var('n', 5);
   *  m.var('n');   // 5
   *
   *  @param name  The declared var name to write.
   *  @param value The new value; must satisfy the var's declared type.
   *  @throws {JssmError} If `name` is not a declared var, or `value` violates the type.
   */
  set_var(name: string, value: any): void {
    if (!this._var_keys.has(name)) {
      throw new JssmError(this, `No such var "${name}"`);
    }
    validate_var_value(name, this._var_types.get(name) as JssmVarType, value, this);
    this._var_values.set(name, value);
  }
```

- [ ] **Step 4: Run to verify it passes**

Run:
```
npx vitest run --config vitest.spec.config.ts src/ts/tests/vars.spec.ts
```
Expected: PASS. Check `mcp__ide__getDiagnostics` on `jssm.ts`.

- [ ] **Step 5: Commit** (separate commands)
```
git add src/ts/jssm.ts src/ts/tests/vars.spec.ts
```
```
git commit -m "feat(var): typed runtime mutation via set_var"
```

---

## Task 8: remaining accessors — `vars`, `known_var`, `known_vars`, `var_type`

**Files:**
- Modify: `src/ts/jssm.ts`
- Test: `src/ts/tests/vars.spec.ts`

- [ ] **Step 1: Write the failing tests**

Append:
```typescript

describe('var: accessors', () => {

  test('vars() returns every var and its value', () => {
    const m = jssm.from('var a : int default 1; var b : boolean default false; x -> y;');
    expect( m.vars() ).toEqual({ a: 1, b: false });
  });

  test('known_var reports declared and undeclared names', () => {
    const m = jssm.from('var a : int default 1; x -> y;');
    expect( m.known_var('a') ).toBe(true);
    expect( m.known_var('z') ).toBe(false);
  });

  test('known_vars lists declared names', () => {
    const m = jssm.from('var a : int default 1; var b : int default 2; x -> y;');
    expect( m.known_vars() ).toEqual(['a', 'b']);
  });

  test('var_type returns the declared type descriptor', () => {
    const m = jssm.from('var n : int 0..3 default 0; x -> y;');
    expect( m.var_type('n') ).toEqual({ kind: 'int', lo: 0, hi: 3 });
  });

  test('var_type on an unknown var throws', () => {
    const m = jssm.from('var n : int default 0; x -> y;');
    expect( () => m.var_type('ghost') ).toThrow(/No such var "ghost"/);
  });

  test('var on an unknown var throws', () => {
    const m = jssm.from('var n : int default 0; x -> y;');
    expect( () => m.var('ghost') ).toThrow(/No such var "ghost"/);
  });

});
```

- [ ] **Step 2: Run to verify it fails**

Run:
```
npx vitest run --config vitest.spec.config.ts src/ts/tests/vars.spec.ts
```
Expected: FAIL — `vars`/`known_var`/`known_vars`/`var_type` are not defined.

- [ ] **Step 3: Implement the accessors**

In `src/ts/jssm.ts`, after `set_var`, add:
```typescript
  /**
   *  Return a plain object mapping every declared var name to its current value.
   *
   *  @example
   *  const m = sm`var a : int default 1; var b : boolean default false; x -> y;`;
   *  m.vars();   // { a: 1, b: false }
   *
   *  @returns An object of every declared var name to its current value.
   */
  vars(): object {
    const result: { [name: string]: any } = {};
    this._var_keys.forEach(name => { result[name] = this._var_values.get(name); });
    return result;
  }

  /**
   *  Check whether a string is the name of a declared var.
   *
   *  @example
   *  const m = sm`var a : int default 1; x -> y;`;
   *  m.known_var('a');   // true
   *  m.known_var('z');   // false
   *
   *  @param name The candidate var name.
   *  @returns Whether the name is a declared var.
   */
  known_var(name: string): boolean {
    return this._var_keys.has(name);
  }

  /**
   *  List every declared var name.
   *
   *  @example
   *  const m = sm`var a : int default 1; var b : int default 2; x -> y;`;
   *  m.known_vars();   // ['a', 'b']
   *
   *  @returns The declared var names in declaration order.
   */
  known_vars(): string[] {
    return [...this._var_keys];
  }

  /**
   *  Return the declared type descriptor of a var.
   *
   *  @example
   *  const m = sm`var n : int 0..3 default 0; x -> y;`;
   *  m.var_type('n');   // { kind: 'int', lo: 0, hi: 3 }
   *
   *  @param name The declared var name.
   *  @returns The var's declared type descriptor.
   *  @throws {JssmError} If `name` is not a declared var.
   */
  var_type(name: string): JssmVarType {
    if (!this._var_keys.has(name)) {
      throw new JssmError(this, `No such var "${name}"`);
    }
    return this._var_types.get(name) as JssmVarType;
  }
```

- [ ] **Step 4: Run to verify it passes**

Run:
```
npx vitest run --config vitest.spec.config.ts src/ts/tests/vars.spec.ts
```
Expected: PASS. Check `mcp__ide__getDiagnostics` on `jssm.ts`.

- [ ] **Step 5: Commit** (separate commands)
```
git add src/ts/jssm.ts src/ts/tests/vars.spec.ts
```
```
git commit -m "feat(var): vars, known_var, known_vars, and var_type accessors"
```

---

## Task 9: duplicate var-name detection

**Files:**
- Modify: `src/ts/jssm_compiler.ts`
- Test: `src/ts/tests/vars.spec.ts`

- [ ] **Step 1: Write the failing test**

Append:
```typescript

describe('var: duplicate names', () => {

  test('redefining a var name throws', () => {
    expect( () => jssm.from('var n : int default 0; var n : int default 1; a -> b;') )
      .toThrow(/redefine var/);
  });

});
```

- [ ] **Step 2: Run to verify it fails**

Run:
```
npx vitest run --config vitest.spec.config.ts src/ts/tests/vars.spec.ts
```
Expected: FAIL — no duplicate-var check exists yet (the machine constructs with the last definition winning, so no throw).

- [ ] **Step 3: Implement the check**

In `src/ts/jssm_compiler.ts`, immediately after the property duplicate-name check (≈ lines 558–566), add the parallel var check:
```typescript
const var_keys    = results['var_definition'].map(vd => vd.name),
      repeat_vars = find_repeated(var_keys);
if (repeat_vars.length) {
  throw new JssmError(undefined, `Cannot redefine var names: ${repeat_vars.join(', ')}`);
}
```
(`find_repeated` and `JssmError` are already imported in this file for the property check.)

- [ ] **Step 4: Run to verify it passes**

Run:
```
npx vitest run --config vitest.spec.config.ts src/ts/tests/vars.spec.ts
```
Expected: PASS. Check `mcp__ide__getDiagnostics` on `jssm_compiler.ts`.

- [ ] **Step 5: Commit** (separate commands)
```
git add src/ts/jssm_compiler.ts src/ts/tests/vars.spec.ts
```
```
git commit -m "feat(var): reject duplicate var names at compile time"
```

---

## Task 10: stochastic (property-based) tests

**Files:**
- Test: `src/ts/tests/vars.stoch.ts` (create)

Mirror the structure of `src/ts/tests/properties.stoch.ts`: generate var names and values with fast-check and assert round-trip behavior. These report coverage independently from the spec suite.

- [ ] **Step 1: Write the stochastic tests**

Create `src/ts/tests/vars.stoch.ts`:
```typescript

import * as jssm from '../jssm';
import * as fc   from 'fast-check';



const ident = fc.stringMatching(/^[a-z][a-z0-9_]{0,7}$/);



describe('var (stochastic)', () => {

  test('an int var round-trips its default for any safe integer', () => {
    fc.assert(
      fc.property(ident, fc.integer({ min: -1000, max: 1000 }), (name, n) => {
        const m = jssm.from(`var ${name} : int default ${n}; a -> b;`);
        return m.var(name) === n;
      })
    );
  });

  test('a boolean var round-trips its default', () => {
    fc.assert(
      fc.property(ident, fc.boolean(), (name, b) => {
        const m = jssm.from(`var ${name} : boolean default ${b}; a -> b;`);
        return m.var(name) === b;
      })
    );
  });

  test('a bounded int rejects any default outside its range', () => {
    fc.assert(
      fc.property(
        ident,
        fc.integer({ min: 0, max: 10 }),
        fc.integer({ min: 0, max: 10 }),
        fc.integer({ min: -100, max: 100 }),
        (name, a, b, v) => {
          const lo = Math.min(a, b), hi = Math.max(a, b);
          const src = `var ${name} : int ${lo}..${hi} default ${v}; s -> t;`;
          const inRange = (v >= lo) && (v <= hi);
          if (inRange) {
            return jssm.from(src).var(name) === v;
          }
          try { jssm.from(src); return false; } catch { return true; }
        }
      )
    );
  });

  test('set_var rejects any out-of-range write on a bounded int', () => {
    fc.assert(
      fc.property(ident, fc.integer({ min: 11, max: 1000 }), (name, v) => {
        const m = jssm.from(`var ${name} : int 0..10 default 0; a -> b;`);
        try { m.set_var(name, v); return false; } catch { return true; }
      })
    );
  });

});
```

- [ ] **Step 2: Run the stochastic suite**

Run:
```
npx vitest run --config vitest.stoch.config.ts src/ts/tests/vars.stoch.ts
```
Expected: PASS. (If a generated name collides with a grammar keyword, tighten the `ident` regex to exclude it.)

- [ ] **Step 3: Confirm the whole stochastic suite is green**

Run:
```
npm run vitest-stoch
```
Expected: all stochastic suites pass.

- [ ] **Step 4: Commit** (separate commands)
```
git add src/ts/tests/vars.stoch.ts
```
```
git commit -m "test(var): stochastic coverage of var declaration and mutation"
```

---

## Task 11: documentation surface

**Files:**
- Modify: `src/ts/jssm.ts` (only if any DocBlock is missing/incomplete)
- Verify: doctest extraction passes

The accessors added in Tasks 1, 7, 8 already carry DocBlocks with `@example`. Doctests are extracted from `@example` tags in `jssm.ts` (one of the doctest entry points), so the examples must be valid, runnable FSL.

- [ ] **Step 1: Verify the `@example` blocks are valid and run as doctests**

Run:
```
npm run make_doctests
```
```
npm run vitest-docs
```
Expected: PASS. (If a doctest fails, the most likely cause is an `@example` whose `// comment` result marker or FSL is invalid — fix the example in `jssm.ts`. Use `// value` result markers exactly as the sibling `prop`/`props` DocBlocks do; do not invent a different marker.)

- [ ] **Step 2: Regenerate the README and confirm it builds**

Run:
```
npm run readme
```
Expected: `README.md` regenerates without error. (The README is generated; do not hand-edit it.)

- [ ] **Step 3: Commit any doc regeneration** (separate commands; skip if nothing changed)
```
git add src/ts/jssm.ts README.md
```
```
git commit -m "docs(var): valid example doctests for the var accessors"
```

---

## Task 12: full verification

**Files:** none (verification only)

- [ ] **Step 1: Lint and audit**

Run:
```
npm run vet
```
Expected: `eslint` (over `jssm.ts`, `jssm_types.ts`, `tests/*.ts`) and `audit` both pass with no errors. (If eslint rejects a method literally named `var`, rename `var(...)`/`vars(...)` consistently — `var` → `get_var`, keeping `vars`, `set_var`, etc. — across `jssm.ts`, `vars.spec.ts`, `vars.stoch.ts`, and update the spec §13 accessor name. Re-run from Step 1.)

- [ ] **Step 2: Full CI test path**

Run:
```
npm run ci_test
```
Expected: `vet` + trimmed build + the full vitest suite (spec, stoch, docs) all green, with the spec suite reporting **100% coverage** over `src/ts/**`. If coverage is below 100%, the report names the uncovered lines — add the missing spec test(s) for those branches (every branch in `validate_var_value`, the construction loop, and each accessor must be hit) and commit them.

- [ ] **Step 3: Final commit if any coverage tests were added** (separate commands; skip if none)
```
git add src/ts/tests/vars.spec.ts
```
```
git commit -m "test(var): close coverage gaps for 100% spec coverage"
```

---

## Self-Review (planner's checklist — completed)

**Spec coverage (against `2026-06-09-fsl-expression-language-design.md` §4–§5, Phase 1 scope):**
- `var` declaration syntax (§5) → Tasks 1, 4, 5 (grammar) ✓
- Scalar type core: `boolean`/`int`/bounded `int`/`string`/`enum` (§4.1) → Tasks 1–5 ✓
- `default` + `required` + validation at construction (§5) → Tasks 1, 6 ✓
- Mutable + typed runtime mutation (the property-vs-var distinction) → Task 7 ✓
- Accessors mirroring `.prop()` family (§5) → Tasks 1, 8 ✓
- **Out of Phase-1 scope (correctly absent):** sized ints, `longint`, `float`/`double`, containers, variants/`option`/`any`, nullable `T?`, function types, `where`/`assign`/expressions, the `checkable` attribute — all deferred to later Phase-1 sub-plans and Phase 2.

**Placeholder scan:** No "TBD"/"handle edge cases"/"similar to Task N". The two contingencies (eslint rejecting `var` as a method name; coverage gaps) name a concrete, specific resolution rather than hand-waving.

**Type consistency:** `JssmVarType` and `JssmVarDefinition` are defined once (Task 1, Step 3) and used identically in `jssm_compiler.ts`, `jssm.ts`, and the accessors. Accessor names — `var`, `vars`, `set_var`, `known_var`, `known_vars`, `var_type` — and the AST key `var_definition` and config option `vars` are used consistently across every task.
