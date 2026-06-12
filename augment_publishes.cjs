'use strict';

/**
 *  One-shot cache augmenter: adds release-cadence fields (publishes6mo /
 *  publishes2yr / lastPublishISO / publishCheckedAt) to every cached library
 *  file for a host, without re-running the expensive throughput/memory
 *  measurements. Use when a new static signal is added and only it needs
 *  backfilling; ordinary runs pick it up through measure_lib.cjs.
 *
 *  Usage: `node augment_publishes.cjs`   (SHOOTOUT_HOST honored; default local)
 */

const fs   = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const HOST = process.env.SHOOTOUT_HOST || `local-${process.arch}`;
const dir  = path.join(__dirname, 'data', HOST);

function publishesFor(libName) {
  const out = execFileSync('npm', ['view', libName, 'time', '--json'],
    { encoding: 'utf8', timeout: 20000, shell: process.platform === 'win32', stdio: ['ignore', 'pipe', 'ignore'] });
  const time = JSON.parse(out);
  const now = Date.now(), sixMo = now - 182 * 864e5, twoYr = now - 730 * 864e5;
  let p6 = 0, p2 = 0, last = null;
  for (const [v, iso] of Object.entries(time)) {
    if (v === 'created' || v === 'modified') continue;
    const t = new Date(iso).getTime(); if (Number.isNaN(t)) continue;
    if (t >= sixMo) p6++;
    if (t >= twoYr) p2++;
    if (!last || t > new Date(last).getTime()) last = iso;
  }
  return { publishes6mo: p6, publishes2yr: p2, lastPublishISO: last, publishCheckedAt: new Date().toISOString() };
}

for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
  const p = path.join(dir, file);
  const data = JSON.parse(fs.readFileSync(p, 'utf8'));
  try {
    const pub = publishesFor(data.name);
    data.static = { ...(data.static || {}), ...pub };
    fs.writeFileSync(p, JSON.stringify(data, null, 2));
    console.log(`${data.name.padEnd(26)} 6mo=${pub.publishes6mo}  2yr=${pub.publishes2yr}`);
  } catch (e) {
    console.log(`${data.name.padEnd(26)} npm view failed: ${e.message.slice(0, 60)}`);
  }
}
