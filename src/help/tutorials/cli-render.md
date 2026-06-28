---
id: tut-cli-render
section: tutorials
title: "CLI: fsl render"
order: 132
teaches: [cli-render]
mentions: [cli-dispatcher, viz-render]
indexTerms: [render, cli render, fsl-render]
---

# CLI: fsl render

`fsl render` turns an `.fsl` file into a diagram from the command line (the `fsl-render` binary does the same standalone).

```sh
fsl render traffic.fsl -o traffic.svg
```

Given a machine file like:

```fsl {teaches: cli-render, run: true}
Red 'go' -> Green 'go' -> Yellow 'go' -> Red;
```

…it writes out the rendered diagram — handy in build scripts and CI.
