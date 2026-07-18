---
id: tut-prompt-overview
section: tutorials
title: "LLM prompt: overview"
order: 140
teaches: [prompt-overview]
mentions: [cli-export-prompt]
indexTerms: [llms.txt, system prompt, agent, concepts]
---

# LLM prompt: overview

The exported system prompt is organized into sections: **Core Concepts** (machines, states, transition types, actions, probabilities, attributes), a **Syntax Guide**, and **Agent Directives** (rules like "always output valid FSL", "use single quotes for actions").

```sh
fsl-export-system-prompt | less
```

It is built to make an LLM produce correct FSL the first time — for example:

```fsl {teaches: prompt-overview, run: true}
machine_name : "Simple Traffic Light";
Red 'timer' => Green 'timer' => Yellow 'timer' => Red;
```
