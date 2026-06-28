---
id: tut-hooks
section: tutorials
title: "Boundary hooks"
order: 46
teaches: [hooks]
mentions: [states, groups]
indexTerms: [hook, on enter, on exit, boundary, callback]
---

# Boundary hooks

A **boundary hook** runs an action when the machine enters or exits a state (or a group). The form is `on enter|exit <state> do '<action>';`.

```fsl {teaches: hooks, run: true}
on enter Locked do 'beep';
Unlocked 'lock' -> Locked 'unlock' -> Unlocked;
```

Hooks fire on the *boundary* — the transition into or out of the named state — which is how you wire side effects to a machine without entangling them in the transitions themselves.
