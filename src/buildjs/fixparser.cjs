
// the head -n -5 solution doesn't work on macs; neither do the common
// sense seds.  screw it

// remove five lines from the end to remove the module.exports that peg places
// then add the es6 module one we have
// then save under the other filename

const fs         = require('fs'),
      orig_fname = './src/ts/fsl_parser.js';

const orig       = fs.readFileSync(orig_fname),
      lines      = `${orig}`.split('\n'),
      tail       = fs.readFileSync('src/buildjs/peg_ts_export_footer.ts');

lines.pop();  // shut up, it's funny
lines.pop();
lines.pop();
lines.pop();
lines.pop();

// pegjs's runtime declares `error(message, location)` and
// `expected(description, location)` with both parameters required, but
// each function's body treats `location` as optional (`!== void 0` check
// with a fallback to `peg$computeLocation`).  Mark the parameter optional
// in the generated TypeScript so action blocks can use the one-argument
// form without tripping `error TS2554: Expected 2 arguments, but got 1`.
const widened = lines.join('\n')
  .replace(/function (error|expected)\((\w+), location\)/g, 'function $1($2, location?)');

/**
 *  Replaces the generated `peg$parseWS` with an allocation-free hand-rolled
 *  scanner.  pegjs 0.10 compiles `([ \t\r\n\v]+ / BlockComment / LineComment)+`
 *  into per-character array pushes plus a regex `.test(charAt())` per
 *  character; since `WS?` is probed at hundreds of grammar positions, that
 *  was the top parser self-time and the main GC source in the `construct()`
 *  profile (#674 / #698).
 *
 *  Behavior is unchanged: the scanner accepts the same language (runs of
 *  space / tab / CR / LF / VT interleaved with block and line comments, at
 *  least one unit), and reports the same named-rule "whitespace" expectation
 *  on failure.  The success value changes from a discarded nested array to
 *  `null`, which nothing observes — no grammar rule binds `x:WS`.
 *
 *  The expectation constant (`peg$cNNN`) is captured from the generated
 *  function rather than hardcoded, because pegjs renumbers its constants on
 *  any grammar edit.
 *
 *  @param body Full generated parser source, after the export-footer trim.
 *  @returns The source with `peg$parseWS` swapped for the fast scanner.
 *
 *  @throws Error when the generated `peg$parseWS` or its expectation constant
 *          cannot be located — i.e. pegjs output drift; update the patterns
 *          here rather than shipping the slow scanner silently.
 *
 *  @example
 *  inline_fast_ws(generated_source).includes('charCodeAt(peg$currPos)')
 *  // => true
 *
 *  @see https://github.com/StoneCypher/jssm/issues/698
 */
function inline_fast_ws(body) {

  // The first `\n  }` after the opener is the function's end: every brace
  // inside the generated body sits at >= 4-space indent.
  const fn_re = /  function peg\$parseWS\(\) \{\n[\s\S]*?\n  \}\n/,
        found = body.match(fn_re);

  if (!found) { throw new Error('fixparser: cannot find generated peg$parseWS'); }

  // The named-rule expectation is the peg$fail argument after the trailing
  // peg$silentFails--.  The inner char-class failures can never report (the
  // rule body always runs with peg$silentFails > 0), so this is the only
  // constant the replacement needs.
  const fn_tail = found[0].slice(found[0].lastIndexOf('peg$silentFails--')),
        c_found = fn_tail.match(/peg\$fail\((peg\$c\d+)\)/);

  if (!c_found) { throw new Error('fixparser: cannot find peg$parseWS expectation constant'); }

  const replacement =
`  function peg$parseWS() {
    var c, r, matched;

    peg$silentFails++;
    matched = false;

    for (;;) {
      c = input.charCodeAt(peg$currPos);
      if (c === 32 || c === 9 || c === 13 || c === 10 || c === 11) {   // space tab cr lf vt
        peg$currPos++;
        matched = true;
        continue;
      }
      if (c !== 47) { break; }   // both comment forms start with '/'
      r = peg$parseBlockComment();
      if (r === peg$FAILED) { r = peg$parseLineComment(); }
      if (r === peg$FAILED) { break; }
      matched = true;
    }

    peg$silentFails--;
    if (matched) { return null; }
    if (peg$silentFails === 0) { peg$fail(${c_found[1]}); }
    return peg$FAILED;
  }
`;

  // Function-valued replacement so `$`-sequences in the scanner source
  // (peg$currPos etc.) are not interpreted as replacement patterns.
  return body.replace(fn_re, () => replacement);
}

/**
 *  Replaces the generated `peg$parseAtom` with an allocation-free hand-rolled
 *  scanner.  pegjs 0.10 compiles `first:AtomFirstLetter text:AtomLetter*` into
 *  one function call plus one regex test per character, collects the matched
 *  characters into an array, and then the semantic action re-joins them — for
 *  every state name in every machine.  The Atom cluster (the two letter rules,
 *  their regexes, the collector loop, and the join action) was ~13% of
 *  `construct()` self-time in the #702 profile.
 *
 *  Behavior is unchanged: the same two character classes are checked as
 *  `charCodeAt` integer comparisons (`AtomFirstLetter` excludes `+ ( ) & # @`,
 *  which only `AtomLetter` admits), the result is the exact matched text via
 *  one `input.substring`, and the same named-rule "atom" expectation is
 *  reported on failure.  The semantic action is a pure concatenation of the
 *  matched characters, so substring is value-identical, including for the
 *  `\x80-￿` tail (surrogate halves pass the class per code unit both
 *  ways).
 *
 *  @param body Full generated parser source, after the WS swap.
 *  @returns The source with `peg$parseAtom` swapped for the fast scanner.
 *
 *  @throws Error when the generated `peg$parseAtom` or its expectation
 *          constant cannot be located — pegjs output drift; update the
 *          patterns here rather than silently shipping the slow scanner.
 *
 *  @example
 *  inline_fast_atom(generated_source).includes('input.substring(start, peg$currPos)')
 *  // => true
 *
 *  @see https://github.com/StoneCypher/jssm/issues/702
 *  @see inline_fast_ws
 */
function inline_fast_atom(body) {

  const fn_re = /  function peg\$parseAtom\(\) \{\n[\s\S]*?\n  \}\n/,
        found = body.match(fn_re);

  if (!found) { throw new Error('fixparser: cannot find generated peg$parseAtom'); }

  const fn_tail = found[0].slice(found[0].lastIndexOf('peg$silentFails--')),
        c_found = fn_tail.match(/peg\$fail\((peg\$c\d+)\)/);

  if (!c_found) { throw new Error('fixparser: cannot find peg$parseAtom expectation constant'); }

  // Character classes from the grammar, as code-unit ranges:
  //   AtomFirstLetter = [0-9a-zA-Z._!$^*?,\x80-￿]
  //   AtomLetter      = AtomFirstLetter + [+()&#@]
  const replacement =
`  function peg$parseAtom() {
    var c, start;

    peg$silentFails++;
    c = input.charCodeAt(peg$currPos);

    if ((c >= 48 && c <= 57)  ||                  // 0-9
        (c >= 97 && c <= 122) ||                  // a-z
        (c >= 65 && c <= 90)  ||                  // A-Z
        c === 46 || c === 95 || c === 33 ||       // . _ !
        c === 36 || c === 94 || c === 42 ||       // $ ^ *
        c === 63 || c === 44 ||                   // ? ,
        c >= 128) {                               // \\x80-\\uFFFF

      start = peg$currPos;
      peg$currPos++;
      c = input.charCodeAt(peg$currPos);

      while ((c >= 48 && c <= 57)  ||
             (c >= 97 && c <= 122) ||
             (c >= 65 && c <= 90)  ||
             c === 46 || c === 95 || c === 33 ||
             c === 36 || c === 94 || c === 42 ||
             c === 63 || c === 44 ||
             c === 43 || c === 40 || c === 41 ||  // + ( )
             c === 38 || c === 35 || c === 64 ||  // & # @
             c >= 128) {
        peg$currPos++;
        c = input.charCodeAt(peg$currPos);
      }

      peg$silentFails--;
      return input.substring(start, peg$currPos);
    }

    peg$silentFails--;
    if (peg$silentFails === 0) { peg$fail(${c_found[1]}); }
    return peg$FAILED;
  }
`;

  return body.replace(fn_re, () => replacement);
}

/**
 *  Replaces the generated `peg$parseTimeType` with a first-char-gated table
 *  scanner.  The grammar's 28 ordered time-unit literals (`'milliseconds'`
 *  … `'w'`) compile to up to 28 sequential `input.substr` probes per `after`
 *  decoration — e.g. `after 50 seconds` walks six failed substring
 *  allocations before matching, and a failing parse walks all 28 (#733).
 *
 *  The replacement walks an extracted table gated on the alternative's first
 *  character code: non-candidates cost one integer compare, candidates one
 *  substring equality (single-character units none at all).  Expectation
 *  bookkeeping is byte-identical to the generated chain: a match at
 *  alternative i replays the fail constants of alternatives 0..i-1 — exactly
 *  the ones the generated code would have probed and recorded — at the same
 *  unmoved position under the same silent/maxFailPos guard, and a total miss
 *  replays all 28.  `peg$savedPos` is set before the action constant runs,
 *  as generated.
 *
 *  Extraction handles both generated probe forms (`input.substr(...) ===
 *  peg$cN` for multi-character literals, `input.charCodeAt(...) === code`
 *  for single-character ones) in source order, resolves first-character
 *  codes from the literal constants' definitions, and asserts exactly 28
 *  alternatives — a grammar edit to the unit list trips loudly here.
 *
 *  @param body Full generated parser source, after the Atom swap.
 *  @returns The source with the table emitted and `peg$parseTimeType`
 *           swapped.
 *  @throws Error when the rule cannot be found, an alternative's literal
 *          definition cannot be resolved, or the alternative count is not 28
 *          — pegjs output / grammar drift; update the patterns here.
 *
 *  @example
 *  inline_timetype_table(generated_source).includes('peg$timetype_alts')
 *  // => true
 *
 *  @see https://github.com/StoneCypher/jssm/issues/733
 *  @see inline_fast_ws
 */
function inline_timetype_table(body) {

  const fn_re = /  function peg\$parseTimeType\(\) \{\n[\s\S]*?\n  \}\n/,
        found = body.match(fn_re);

  if (!found) { throw new Error('fixparser: cannot find generated peg$parseTimeType'); }

  const fn = found[0];

  // Both probe forms, captured with enough tail to grab the fail constant
  // and the action constant that follows a successful probe.
  const substr_re   = /if \(input\.substr\(peg\$currPos, (\d+)\) === (peg\$c\d+)\) \{[\s\S]*?peg\$fail\((peg\$c\d+)\);[\s\S]*?s1 = (peg\$c\d+)\(\);/g;
  const charcode_re = /if \(input\.charCodeAt\(peg\$currPos\) === (\d+)\) \{\s*\n\s*s1 = (peg\$c\d+);[\s\S]*?peg\$fail\((peg\$c\d+)\);[\s\S]*?s1 = (peg\$c\d+)\(\);/g;

  // The lazy [\s\S]*? tails can overrun into the next alternative when run
  // naively over the whole body, so alternatives are located by their probe
  // headers first, then parsed one segment at a time.
  const headers = [...fn.matchAll(/if \(input\.(substr\(peg\$currPos, \d+\) === peg\$c\d+|charCodeAt\(peg\$currPos\) === \d+)\) \{/g)];

  const alts = headers.map((h, i) => {
    const seg_end = (i + 1 < headers.length) ? headers[i + 1].index : fn.length;
    const seg     = fn.slice(h.index, seg_end);

    substr_re.lastIndex   = 0;
    charcode_re.lastIndex = 0;

    const sm = substr_re.exec(seg);
    if (sm && sm.index === 0) {
      return { len: parseInt(sm[1], 10), lit: sm[2], fail: sm[3], act: sm[4], code: undefined };
    }
    const cm = charcode_re.exec(seg);
    if (cm && cm.index === 0) {
      return { len: 1, lit: cm[2], fail: cm[3], act: cm[4], code: parseInt(cm[1], 10) };
    }
    throw new Error('fixparser: unrecognized TimeType alternative shape (pegjs output drift?)');
  });

  if (alts.length !== 28) {
    throw new Error(`fixparser: TimeType has ${alts.length} alternatives (expected 28); grammar drift — re-derive the table`);
  }

  // First-char codes for substr-form alternatives come from the literal
  // constant definitions ('peg$cN = "milliseconds"').
  for (const alt of alts) {
    if (alt.code === undefined) {
      const def = body.match(new RegExp(`${alt.lit.replace('$', '\\$')} = "([^"]+)"`));
      if (!def) { throw new Error(`fixparser: cannot resolve literal ${alt.lit} for TimeType table`); }
      alt.code = def[1].charCodeAt(0);
    }
  }

  const table_rows = alts
    .map((a) => `[${a.len}, ${a.lit}, ${a.fail}, ${a.act}, ${a.code}]`)
    .join(',\n    ');

  const replacement =
`  var peg$timetype_alts = [
    ${table_rows}
  ];

  function peg$parseTimeType() {
    var i, j, alt, start;
    var c = input.charCodeAt(peg$currPos);

    for (i = 0; i < 28; i++) {
      alt = peg$timetype_alts[i];
      if (alt[4] !== c) { continue; }                                        // first-char gate
      if (alt[0] !== 1 && input.substr(peg$currPos, alt[0]) !== alt[1]) { continue; }

      // replay the expectations of every alternative the generated chain
      // would have probed and failed before this one, at the unmoved position
      if (peg$silentFails === 0 && peg$currPos >= peg$maxFailPos) {
        for (j = 0; j < i; j++) { peg$fail(peg$timetype_alts[j][2]); }
      }

      start = peg$currPos;
      peg$currPos += alt[0];
      peg$savedPos = start;
      return alt[3]();
    }

    if (peg$silentFails === 0 && peg$currPos >= peg$maxFailPos) {
      for (j = 0; j < 28; j++) { peg$fail(peg$timetype_alts[j][2]); }
    }
    return peg$FAILED;
  }
`;

  return body.replace(fn_re, () => replacement);
}

/**
 *  Hoists `peg$fail`'s early-return condition into every generated guard
 *  site.  `peg$fail` is called at every failed match attempt outside named
 *  rules — ~835 generated sites, millions of calls per large parse — and
 *  nearly every call exits at its first line (`peg$currPos < peg$maxFailPos`),
 *  making the cost almost pure call overhead: 6.7% of `construct()` self-time
 *  in the #704 profile.  Rewriting
 *
 *      if (peg$silentFails === 0) { peg$fail(peg$cN); }
 *  to
 *      if (peg$silentFails === 0 && peg$currPos >= peg$maxFailPos) { peg$fail(peg$cN); }
 *
 *  replaces the common-case call with one inline integer compare.  The
 *  condition is `peg$fail`'s own first-line test lifted verbatim, so
 *  expectation collection — and therefore every parse-error message — is
 *  byte-identical.  The single non-constant site (`peg$endExpectation()`,
 *  once per parse at EOF) is deliberately left untouched.
 *
 *  @param body Full generated parser source, after the WS and Atom swaps.
 *  @returns The source with all constant-expectation guard sites rewritten.
 *
 *  @throws Error when fewer than 500 sites are rewritten — pegjs output
 *          drift; update the site pattern rather than silently shipping
 *          unguarded calls.
 *
 *  @example
 *  inline_fail_guard(generated_source).includes('&& peg$currPos >= peg$maxFailPos')
 *  // => true
 *
 *  @see https://github.com/StoneCypher/jssm/issues/704
 *  @see inline_fast_ws
 */
function inline_fail_guard(body) {

  const site_re = /if \(peg\$silentFails === 0\) \{ peg\$fail\((peg\$c\d+)\); \}/g;

  let count = 0;
  const out = body.replace(site_re, (_m, constant) => {
    count++;
    return `if (peg$silentFails === 0 && peg$currPos >= peg$maxFailPos) { peg$fail(${constant}); }`;
  });

  if (count < 500) {
    throw new Error(`fixparser: peg$fail guard rewrite hit only ${count} sites (expected ~835); pegjs output drift?`);
  }

  return out;
}

const body = inline_fail_guard(inline_timetype_table(inline_fast_atom(inline_fast_ws(widened))));

fs.writeFileSync('./src/ts/fsl_parser.ts', body + tail);
fs.unlinkSync(orig_fname);
