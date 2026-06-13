module.exports = {
  title: 'User account groups',
  category: 'Patterns',
  tags: ['groups', 'auth', 'account', 'overlap'],
  problem: "A user account is several things at once: authenticated, active, paid, restricted. Those axes overlap — a Suspended user is still authenticated but no longer active, a Premium user is active and paid. Overlapping groups model each axis independently instead of forcing one state-per-combination tree.",
  blocks: [
    {
      kind: 'fsl',
      title: 'account.fsl',
      code: `const account = sm\`
  // four overlapping axes over the same five states
  &Authenticated    : [Free Premium Suspended Banned];
  &Active           : [Free Premium];
  &Paid             : [Premium];
  &RestrictedAccess : [Suspended Banned];

  LoggedOut 'login'     → Free;
  Free      'upgrade'   → Premium;
  Premium   'downgrade' → Free;

  Free      'suspend'   → Suspended;
  Premium   'suspend'   → Suspended;
  Suspended 'reinstate' → Free;
  Suspended 'ban'       → Banned;

  // one logout edge from every authenticated state, plus a group hook
  &Authenticated 'logout' → LoggedOut;
  on exit &Active do 'revoke_session';

  // shared default styling for everyone in a group
  state &Paid             : { background-color: gold; };
  state &RestrictedAccess : { background-color: tomato; };
\`;
`,
    },
    {
      kind: 'js',
      title: 'checks.js',
      code: `account.action('login');     // LoggedOut → Free
account.isIn('Active');       // true
account.isIn('Paid');         // false

account.action('upgrade');    // Free → Premium
account.groupsOf('Premium');  // Set { 'Authenticated', 'Active', 'Paid' }

account.action('suspend');    // Premium → Suspended (fires 'revoke_session')
account.isIn('Active');        // false — left the &Active group
account.isIn('Authenticated'); // true  — still authenticated
account.isIn('RestrictedAccess'); // true

account.statesIn('Authenticated'); // ['Free','Premium','Suspended','Banned']
`,
    },
  ],
  note: "`Premium` lives in three groups at once — `Authenticated`, `Active`, and `Paid` — which no single-parent hierarchy can express. `&Authenticated 'logout' → LoggedOut` fans the same logout out to every member. `on exit &Active` fires when a user leaves the active axis (suspend, ban, or logout) but stays quiet on moves that stay inside it (upgrade/downgrade). Group metadata (`state &Paid : { … }`) styles every member through the runtime cascade.",
};
