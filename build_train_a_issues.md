=== #1842 Linguist example .fsl files don't parse — deprecated jssm_version + version-range value ===
## The 11 `src/machines/linguist/*.fsl` example files don't parse against the current grammar

These are the GitHub-Linguist language-detection samples (cf. #409), so they should be canonical, parseable FSL — but none of them currently parse. Two independent causes:

**1. Deprecated attribute name `jssm_version` (10 of 11 files).** `src/ts/fsl_parser.peg` defines `fsl_version` (L1236) and `machine_version` (L1206) but has **no `jssm_version` rule**, so files declaring `jssm_version : >= 5.0.0;` fail at the version attribute.

**2. A version *range* value where a bare SemVer is required (all 11 files).** The `fsl_version` rule is `value: SemVer` — a bare `5.0.0`, not a comparator range. Every file uses `>= 5.0.0` (e.g. `sip.fsl` uses the correct attribute name but still `fsl_version : >= 5.0.0;`), which is not a `SemVer`, so even the well-named one fails.

### Affected files (all under `src/machines/linguist/`)
`bgp.fsl`, `eMMC Transfer Mode.fsl`, `extensive states of matter.fsl`, `fourway simple intersection.fsl`, `http 1.0.fsl`, `sip.fsl` (uses `fsl_version`), `states of matter.fsl`, `tcp ip.fsl`, `traffic light.fsl`, `turnstile.fsl`, `video game random weather.fsl`.

### Fix
- Update the samples to `fsl_version : 5.0.0;` (bare version, current attribute name), and drop the `jssm_version` spelling; **or**
- If a *minimum-version requirement* (`>= 5.0.0`) is genuinely intended for these samples, that's the version-gating surface (#410 / `minimum-supported language version`) — but the sample files must use whatever the shipped grammar accepts today, and today it accepts neither.

Worth a small parse-round-trip test over `src/machines/linguist/*.fsl` so the Linguist samples can't silently rot out of grammar again.

### Provenance
Flagged as bug #3 in the 2026-05-12 CodeMirror-editor sketch handoff ("a separate bug worth reporting, NOT part of this task"). That handoff has since been retired; confirmed still present 2026-07-10 (grammar has no `jssm_version`; `fsl_version` value is `SemVer`, not a range). Filed at John's request.


=== #112 Put linting and auditing into place for the example machines ===
Want them to have headers and etc, doncha know

=== #820 Write a page on how to use in the browser ===
(no body)

=== #877 Oof.  A practical SCSI state machine example? ===
https://www.spinics.net/lists/linux-scsi/msg172016.html

=== #879 USB Device State from Oracle's Solaris docs ===
![image](https://user-images.githubusercontent.com/77482/174451290-cc0efccc-1cc4-4bbb-80a6-6540d148d780.png)

https://docs.oracle.com/cd/E18752_01/html/816-4854/usb-43.html

=== #518 NSA hiring flowchart ===
![image](https://user-images.githubusercontent.com/77482/89081800-02b56a00-d341-11ea-8738-cf21a3f10173.png)


=== #499 Unweighted and gender weighted family trees ===
Make an example (see #) with the same family tree four times:

1. Parents to dot, dot spread to children (merged)
1. Each parent with `->` (equal-weight)
1. Mom with `=>`, dad with `~>` (female-oriented)
1. Dad with `=>`, mom with `~>` (male-oriented)


=== #252 Holiday machines  ===
(no body)

=== #44 Oil cracking SL ===
![image](https://user-images.githubusercontent.com/77482/50403031-4bae4100-0750-11e9-9d30-fe1a9985e6eb.png)

https://en.wikipedia.org/wiki/Process_flow_diagram#/media/File:RefineryFlow.png
