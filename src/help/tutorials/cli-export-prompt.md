---
id: tut-cli-export-prompt
section: tutorials
title: "CLI: fsl export-system-prompt"
order: 136
teaches: [cli-export-prompt]
mentions: [cli-dispatcher]
indexTerms: [system prompt, llms.txt, export prompt]
---

# CLI: fsl export-system-prompt

`fsl-export-system-prompt` prints an `llms.txt`-style FSL syntax guide for feeding to a large language model, so an agent can generate idiomatic FSL.

```sh
fsl-export-system-prompt > fsl-llms.txt
```

The prompt teaches an LLM to produce machines like:

```fsl {teaches: cli-export-prompt, run: true}
machine_name : "Generated";
Idle 'start' -> Running 'stop' -> Idle;
```
