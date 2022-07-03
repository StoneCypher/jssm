
const fs    = require('fs'),
      color = require('cli-color');

const header   = s => color.yellow.bold(s),
      header2  = s => color.yellow(s),
      language = s => color.cyan.bold(s),
      data     = s => color.white.bold(s),
      negative = s => color.red.bold(s),
      positive = s => color.white.bold(s),
      zero     = s => color.xterm(241)(s),
      special  = s => color.green.bold(s);

const hpad_width = 2,
      hpad       = ' '.repeat(hpad_width),
      vsep       = '-',
      min_head   = 5;

const wt = JSON.parse( fs.readFileSync('./coverage/cloc/report_wt.json') ),
      nt = JSON.parse( fs.readFileSync('./coverage/cloc/report_nt.json') );

const uniq = (arr) =>
  arr.filter((v, i, a) =>
    a.indexOf(v) === i);

const sized_l = (s, ranged, min) => s.toLocaleString().padRight(Math.max(min ?? 0, ranged ?? 0)),
      sized_r = (s, ranged, min) => s.toLocaleString().padStart(Math.max(min ?? 0, ranged ?? 0)),
      sized_c = (s, ranged, min) => {
        const bs = s.toLocaleString(),
              pd = Math.max(min ?? 0, ranged ?? 0),
              bl = bs.padStart(Math.floor(pd / 2));
        return bl.split('').reverse().join('').padStart(Math.ceil(pd / 2)).split('').reverse().join('');
      }

const banned_keys = ['SUM', 'header'],
      with_tests  = Object.keys(wt).filter( k => (!(banned_keys.includes(k))) ),
      no_tests    = Object.keys(nt).filter( k => (!(banned_keys.includes(k))) ),
      all_keys    = uniq( [ ... with_tests, ... no_tests ] ),
      key_width   = Math.max( ... all_keys.map( k => k.length ) ),
      wc_width    = Math.max( ... with_tests.map(k => fnum(wt[k]?.code    ?? 0).length ?? 0) ),
      wm_width    = Math.max( ... with_tests.map(k => fnum(wt[k]?.comment ?? 0).length ?? 0) ),
      wf_width    = Math.max( ... with_tests.map(k => fnum(wt[k]?.nFiles  ?? 0).length ?? 0) ),
      nc_width    = Math.max( ... no_tests.map(  k => fnum(nt[k]?.code    ?? 0).length ?? 0) ),
      nm_width    = Math.max( ... no_tests.map(  k => fnum(nt[k]?.comment ?? 0).length ?? 0) ),
      nf_width    = Math.max( ... no_tests.map(  k => fnum(nt[k]?.nFiles  ?? 0).length ?? 0) ),
      h1_width    = Math.max(min_head, nc_width) + Math.max(min_head, nm_width) + Math.max(min_head, nf_width) + (2*hpad_width),
      h2_width    = Math.max(min_head, wc_width) + Math.max(min_head, wm_width) + Math.max(min_head, wf_width) + (2*hpad_width);





all_keys

  // sort based on the number of code lines
  // substitute empty objects for missing languages and 0 for langs without code
  .sort( (l,r) => ((nt[l] || {}).code ?? 0) - ((nt[r] || {}).code ?? 0) )

  // provided sort is smallest-first; reverse
  .reverse();





function fnum(n) {
  return n.toLocaleString();
}

function cfnum(n = 0) {
  if (typeof(n) !== 'number') { throw new TypeError('cfnum is for numbers'); }
  if (n < 0) { return negative(fnum(n)); }
  if (n > 0) { return positive(fnum(n)); }
  if (n === 0) { return zero(fnum(n)); }
  return special(fnum(n));
}

function szcfnum(n = 0, range_max, min = 5, dir = 'right', filler = ' ') {
  if (typeof(n) !== 'number') { throw new TypeError('szcfnum is for numbers'); }
  const f   = fnum(n),
        fl  = f.length,
        w   = Math.max(range_max, min),
        pad = w - fl,
        lp  = (dir === 'left'? 0   : (dir === 'right'? pad : Math.ceil( (w-f.length) / 2))),
        rp  = (dir === 'left'? pad : (dir === 'right'? 0   : Math.trunc((w-f.length) / 2))),
        t   = `${filler.repeat(lp)}${f}${filler.repeat(rp)}`;
  if (n < 0) { return negative(t); }
  if (n > 0) { return positive(t); }
  if (n === 0) { return zero(t); }
  return special(t);
}

function heading(tx, w, dir = 'center', filler = ' ') {

  const pad = w - tx.length,
        lp  = (dir === 'left'? 0   : (dir === 'right'? pad : Math.ceil( (w-tx.length) / 2))),
        rp  = (dir === 'left'? pad : (dir === 'right'? 0   : Math.trunc((w-tx.length) / 2)));

  return `${filler.repeat(lp)}${tx}${filler.repeat(rp)}`;

}





const bh = sized_r('', key_width),  // blank header the width of the languages
      tt = zero(heading('CLOC', key_width, 'right', ' ')),
      lh = header2('Lines'),
      ch = header2('Cmnts'),
      fh = header2('Files'),
      ln = header('Lines'),
      cn = header('Cmnts'),
      fn = header('Files'),
      h1 = header( heading(' Without tests ', h1_width, 'center', '-')),
      h2 = header2(heading(' With tests ',    h2_width, 'center', '-'));

console.log(`\n${hpad}${tt}${hpad}${h1}${hpad}${h2}`);
console.log(`${hpad}${bh}${hpad}${ln}${hpad}${cn}${hpad}${fn}${hpad}${lh}${hpad}${ch}${hpad}${fh}`);

all_keys.forEach( k => {

  if (typeof k !== 'string') {
    throw 'broken key';
  } else {

    const lang  = language(k.padStart(key_width)),
          ncode = szcfnum((nt[k] ?? {}).code,    nc_width, min_head, 'right'),
          ncmnt = szcfnum((nt[k] ?? {}).comment, nm_width, min_head, 'right'),
          nfile = szcfnum((nt[k] ?? {}).nFiles,  nf_width, min_head, 'right'),
          wcode = szcfnum((wt[k] ?? {}).code,    wc_width, min_head, 'right'),
          wcmnt = szcfnum((wt[k] ?? {}).comment, wm_width, min_head, 'right'),
          wfile = szcfnum((wt[k] ?? {}).nFiles,  wf_width, min_head, 'right');

    console.log(`${hpad}${lang}${hpad}${ncode}${hpad}${ncmnt}${hpad}${nfile}${hpad}${wcode}${hpad}${wcmnt}${hpad}${wfile}`);

  }

});
