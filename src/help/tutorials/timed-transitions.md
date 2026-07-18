---
id: tut-timed-transitions
section: tutorials
title: "Timed transitions"
order: 30
teaches: [timed-transitions]
mentions: [transitions]
indexTerms: [after, timeout, delay, timer, seconds]
---

# Timed transitions

A transition can fire **on its own after a delay** using `after`. This is how you model timeouts — a traffic light that advances itself, a session that expires.

```fsl {teaches: timed-transitions, run: true}
Green after 5 -> Yellow;
Yellow after 2 -> Red;
Red after 5 -> Green;
```

**Watch the units.** A bare `after 5` means **five seconds**, not five milliseconds — the implicit scale is 1000. Write `after 500ms` if you really mean milliseconds. This trips people up constantly, so when in doubt, spell the unit out.
