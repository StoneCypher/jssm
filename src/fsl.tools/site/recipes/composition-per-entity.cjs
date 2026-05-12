module.exports = {
  title: 'One machine per entity',
  category: 'Composition',
  tags: ['per-row', 'instances', 'lifecycle'],
  problem: "Don't try to fit ten orders into one machine. Spin up a fresh instance per row, and let each one run its own lifecycle independently.",
  blocks: [
    {
      kind: 'ts',
      title: 'machineFor.ts',
      code: `const OrderM = () => sm\`
  cart 'pay' → paid 'ship' → done;
\`;

const byId = new Map();
function machineFor(id) {
  if (!byId.has(id)) byId.set(id, OrderM());
  return byId.get(id);
}
`,
    },
  ],
  note: "Each entity carries its own state — no shared bag of flags, no row accidentally inheriting another's status. When the row's gone, drop its machine.",
};
