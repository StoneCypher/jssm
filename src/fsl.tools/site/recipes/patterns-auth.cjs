module.exports = {
  title: 'Auth flow',
  category: 'Patterns',
  tags: ['auth', 'session', 'lifecycle'],
  problem: "Sign-in, sign-out, and session-expired collapsed into a single machine. The login form, the home screen, and the silent-refresh worker all read the same `state()`.",
  blocks: [
    {
      kind: 'fsl',
      title: 'session.fsl',
      code: `const session = sm\`
  signed_out  'submit'   → authenticating;
  authenticating 'ok'    → signed_in;
  authenticating 'fail'  → signed_out;
  signed_in   'expire'   → refreshing;
  refreshing  'ok'       → signed_in;
  refreshing  'fail'     → signed_out;
  signed_in   'sign_out' → signed_out;
\`;
`,
    },
  ],
  note: "Two interesting properties fall out for free: silent refresh never strands the user in `signed_out` *during* refresh (it's a distinct state), and `sign_out` is only legal from `signed_in` — you can't sign out twice.",
};
