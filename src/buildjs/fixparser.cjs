
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

const body = inline_fast_ws(widened);

fs.writeFileSync('./src/ts/fsl_parser.ts', body + tail);
fs.unlinkSync(orig_fname);
