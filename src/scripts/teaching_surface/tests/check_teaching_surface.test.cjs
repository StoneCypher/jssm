const assert = require('node:assert/strict');
const { runChecks } = require('../check_teaching_surface.cjs');

(async () => {
  const r = await runChecks();
  // Partition (#1) must hold; present pages must validate (#2-#4, fences).
  assert.equal(r.partition.ok, true, 'partition ok');
  assert.equal(r.treatment.ok, true, 'present treatment ok');
  assert.equal(r.stale.ok, true, 'no stale references');
  assert.equal(r.dag.ok, true, 'dependsOn is a DAG');
  assert.equal(r.fences.ok, true, 'all fsl fences parse');
  assert.ok(Array.isArray(r.reportUncovered), 'uncovered features reported, not failed');
  assert.equal(r.ok, true);
  console.log('check_teaching_surface OK');
})();
