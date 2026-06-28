---
id: tut-prompt-examples
section: tutorials
title: "LLM prompt: worked examples"
order: 142
teaches: [prompt-examples]
mentions: [prompt-overview]
indexTerms: [example, basic machine, actions]
---

# LLM prompt: worked examples

The Syntax Guide section carries worked examples an LLM can pattern-match: a Basic Machine, Actions and Multiple Targets, and Explicit State Declarations. The explicit-state example shows styled `state` blocks:

```fsl {teaches: prompt-examples, run: true}
state Red : {
  background-color : red;
  text-color       : white;
};

state Green : {
  background-color : green;
};

Red -> Green;
```

These are the same patterns the rest of this curriculum teaches — the prompt distils them for a machine reader.
