# Canonical `source_hash` — Specification (C1)

> **Status:** draft-normative (Fable, 2026-07-04) — review then swap into the M1 seam.
> **Scope:** defines THE `source_hash` that certificates, receipts, tapes, lockfiles, and
> `--json` results bind to (irreversibles #1), plus `proof_input_hash` (irreversibles #14
> minimal slice). Replaces M3's `provisional:` FNV-1a via the named seam in `fsl_hash.ts`.

## 1. Normalization pipeline (in order, nothing else)

1. **Decode** input bytes as UTF-8; invalid sequences or lone surrogates → **refuse**
   (`invalid_source_encoding`), never repair.
2. **Strip one leading BOM** (U+FEFF) if present.
3. **Line endings:** every CRLF and lone CR → LF. (Kills the git-autocrlf cross-OS mismatch,
   omissions D1.)
4. **Unicode NFC** normalize. (Kills macOS NFD-filesystem divergence.)
5. Nothing more. **Whitespace and comments remain significant** — this is *source* identity;
   formatted/AST/semantic identities are separate future layers and are NOT this hash.

## 2. The hash

`source_hash = "sha256:" + lowercase-hex( SHA-256( UTF-8(normalized text) ) )` — 64 hex chars.

- **Implementation constraint:** synchronous and isomorphic (no Node-only, no async WebCrypto
  on the engine path): vendor a dependency-free pure-JS SHA-256; the conformance vectors pin
  it. Cross-host implementations (Rust etc.) must match byte-for-byte.
- The tag is load-bearing: verifiers **refuse** on tag mismatch. `provisional:` hashes are
  accepted **with a warning** through the v6–v8 majors (re-stamp by replay when touched) and
  **refused from v9** (the Transactional major, where certificates begin to matter socially).

## 3. `proof_input_hash`

`"sha256:" + hex( SHA-256( UTF-8( canonicalize(P) ) ) )` where `canonicalize` is RFC 8785
(`fsl_canonical`) and `P = { v: 1, source_hash, property, assumptions, checker,
checker_version }` — `property` as canonical (formatted) property text; `assumptions` an array
sorted by code-unit order; `checker`/`checker_version` strings. This is what M1 certificates
record per property; a change to ANY component is a different proof identity.

## 4. Conformance vectors (ship with the swap; all must pass on every host)

1. empty document → hash of empty string (fixed value in vector file)
2. `a -> b;` plain ASCII
3. same text with CRLF endings → **identical** to (2)
4. same text with leading BOM → **identical** to (2)
5. `café` in NFC vs NFD → **identical** hashes
6. astral (`𝜋`) content — codepoint-correct hashing
7. lone-surrogate bytes → refusal, `invalid_source_encoding`
8. two documents differing only in a comment → **different** hashes (comments significant)
9. two documents differing only in interior whitespace → **different** hashes
10. `provisional:`-tagged tape against matching source → warning-accept (pre-v9 behavior)

## 5. Rationale (one line each)

LF-normalize: identical checkouts hash identically on every OS. NFC: identical keystrokes hash
identically from every editor/filesystem. BOM-strip: invisible editor artifacts must not fork
identity. Refuse-don't-repair on bad encoding: a hash over repaired text attests to something
nobody wrote. Keep whitespace/comments: source identity must distinguish what the author
actually saved — semantic equality is the *semantic* hash's job, later, per irreversibles #14.
