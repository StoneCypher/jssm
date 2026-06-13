module.exports = {
  title: 'Overlapping groups',
  category: 'Patterns',
  tags: ['groups', 'http', 'hooks', 'overlap'],
  problem: "An HTTP request is simultaneously \"in progress\" and \"receiving\" — two orthogonal axes of membership that don't fit a tree. Overlapping groups let one state belong to several groups at once, so a transition or a boundary hook can target a whole axis instead of every member by hand.",
  blocks: [
    {
      kind: 'fsl',
      title: 'request.fsl',
      code: `const req = sm\`
  // two overlapping axes: connection lifecycle vs. data flow
  &InProgress : [connecting sending receiving];
  &Receiving  : [receiving draining];

  idle       'send'  → connecting;
  connecting 'open'  → sending;
  sending    'reply' → receiving;
  receiving  'eof'   → draining;
  draining   'done'  → idle;

  // one edge from EVERY member of the group — abort works mid-flight
  &InProgress 'abort' → idle;

  // boundary hooks fire when a transition crosses the group edge
  on enter &Receiving do 'rx_start';
  on exit  &Receiving do 'rx_end';
\`;
`,
    },
    {
      kind: 'js',
      title: 'drive.js',
      code: `req.action('send');         // idle → connecting
req.isIn('InProgress');      // true
req.isIn('Receiving');       // false — not there yet

req.action('open');          // connecting → sending
req.action('reply');         // sending → receiving (fires 'rx_start')
req.isIn('Receiving');       // true
req.groupsOf('receiving');   // Set { 'InProgress', 'Receiving' } — overlap

req.action('abort');         // &InProgress 'abort' → idle (fires 'rx_end')
req.state();                 // 'idle'
`,
    },
  ],
  note: "`receiving` is in both groups at once — it is in-progress *and* receiving. `&InProgress 'abort' → idle` expands to one abort edge per member, so any in-flight state can bail out without you writing five near-identical lines. `on enter`/`on exit &Receiving` fire only when a transition crosses the group boundary, never on moves that stay inside it.",
};
