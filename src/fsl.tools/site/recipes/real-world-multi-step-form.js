module.exports = {
  title: 'Multi-step form',
  category: 'Real world',
  tags: ['wizard', 'navigation', 'forms'],
  problem: "Wizard, checkout, onboarding. Forward and back navigation, with the submit button only legal on the last step.",
  blocks: [
    {
      kind: 'fsl',
      title: 'wizard.fsl',
      code: `const wizard = sm\`
  account  'next'    → profile;
  profile  'next'    → review;
  review   'submit'  → done;

  profile  'back'    → account;
  review   'back'    → profile;
\`;

// 'submit' is only legal on 'review' — the button literally cannot fire elsewhere
`,
    },
  ],
  note: "The disabled-state for the submit button comes for free: `wizard.valid_action('submit')` tells you whether to grey it out, and you wired no logic to make that work.",
};
