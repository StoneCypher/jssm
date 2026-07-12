
/*******
 *
 *  Emits the build's CLOC report as GitHub-flavored markdown on stdout, for
 *  appending to a workflow job summary ($GITHUB_STEP_SUMMARY).  Exists so the
 *  line counts the release build already computes are visible on the Actions
 *  run page without downloading artifacts (fsl#986).
 *
 *  Reads the same two JSON reports the build's `cloc` step writes:
 *  `coverage/cloc/report_wt.json` (with tests) and `report_nt.json` (without).
 *  Prints one table, languages sorted by no-tests code lines descending, with
 *  a SUM row.  Exits nonzero with a plain message if the reports are missing
 *  (i.e., run it only after `npm run cloc` or a full build).
 *
 *  ```
 *  node src/buildjs/cloc_summary_md.cjs >> "$GITHUB_STEP_SUMMARY"
 *  ```
 *
 *  @see cloc_report.cjs — the human-facing colored console twin
 *
 */

const { readFileSync } = require('fs');

let wt, nt;
try {
  wt = JSON.parse( readFileSync('./coverage/cloc/report_wt.json') );
  nt = JSON.parse( readFileSync('./coverage/cloc/report_nt.json') );
} catch (e) {
  console.error(`cloc_summary_md: cloc reports not found under ./coverage/cloc/ — run the build's cloc step first (${e.message})`);
  process.exit(1);
}

const banned = ['header'];

const langs = [ ...new Set([ ...Object.keys(nt), ...Object.keys(wt) ]) ]
  .filter( k => !banned.includes(k) )
  .sort( (a, b) => (nt[b]?.code ?? 0) - (nt[a]?.code ?? 0) );

const n = v => (v ?? 0).toLocaleString('en-US');

console.log('## Lines of code (cloc)');
console.log('');
console.log('| Language | Files | Code | Comment | Files w/tests | Code w/tests | Comment w/tests |');
console.log('|---|---:|---:|---:|---:|---:|---:|');

for (const k of langs) {
  const label = (k === 'SUM') ? '**SUM**' : k;
  const l = [
    label,
    n(nt[k]?.nFiles), n(nt[k]?.code), n(nt[k]?.comment),
    n(wt[k]?.nFiles), n(wt[k]?.code), n(wt[k]?.comment),
  ];
  console.log('| ' + l.join(' | ') + ' |');
}
