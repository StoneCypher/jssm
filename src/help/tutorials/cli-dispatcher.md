---
id: tut-cli-dispatcher
section: tutorials
title: "CLI: the fsl command"
order: 130
teaches: [cli-dispatcher]
mentions: [cli-render]
indexTerms: [cli, fsl, dispatcher, --help, --version]
---

# CLI: the fsl command

The `fsl` command is the entry point (with `jssm` as an alias). It dispatches subcommands and supports the usual `--help` / `--version` flags.

```sh
fsl --version
fsl --help
fsl render machine.fsl
```

The files it works on contain ordinary FSL:

```fsl {teaches: cli-dispatcher, run: true}
machine_name : "From a file";
a 'go' -> b;
```
