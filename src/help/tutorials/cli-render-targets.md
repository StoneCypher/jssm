---
id: tut-cli-render-targets
section: tutorials
title: "CLI: render output formats"
order: 134
teaches: [cli-render-targets]
mentions: [cli-render]
indexTerms: [svg, png, jpeg, dot, html, format, export]
---

# CLI: render output formats

`fsl render` can emit several formats via `--target`: `svg` (default), `png`, `jpeg`, `dot`, and `html`.

```sh
fsl render machine.fsl --target png  -o machine.png
fsl render machine.fsl --target dot  -o machine.dot
```

The same machine renders to any of them:

```fsl {teaches: cli-render-targets, run: true}
a 'go' -> b 'go' -> c;
```
