# Signed run-receipts (proof-carrying runs) — design

> **Status:** DRAFT — approved in brainstorm 2026-06-24. Extends the v6 megaspec
> (`2026-06-09-fsl-megaspec.md`). Slots as a new **§25.2** beside the verification-certificate
> text in §25.1, and supplies the run-attestation half of the deferred **§29 Security / effects
> model** appendix. Targets the v6 integration branch.

---

## 1. One-sentence frame

A signed run-receipt is the **runtime dual of the verification certificate**.

- **Certificate** (exists, §25.1, design-time): a signed claim *∀ runs, machine@`hash` has property φ* — universal, reproducible by anyone from public source, so it can be key-free in principle (v6 signs it anyway for provenance).
- **Run-receipt** (this design, runtime): a signed claim *∃ **this** run, of machine@`hash`, satisfies φ, attributed to subject S, at authenticity tier T* — existential and identity-bound, therefore it **must** be signed (it cannot be re-derived from public information; only the issuer who replayed/witnessed the run can vouch).

That logical-shape difference (universal/reproducible vs. existential/identity-bound) is *why* certificates could be key-free but receipts fundamentally cannot. The shared hinge is `machine_source_hash`: a receipt cites the certified machine it is a run *of*, inheriting "the rules are proven sound."

## 2. Why this is mostly assembly, not invention

Everything cryptographic already exists in §25 for certificates and is inherited wholesale:

- **sigstore-style keyless signing** bound to OIDC identity (no key management — the single decision that makes issuance a one-liner instead of a project);
- append-only **transparency log** (attributable, tamper-evident, trusted timestamps);
- **revocation & advisory feed** (RustSec/GHSA-shaped; a checker/runtime CVE flags affected receipts);
- the **repro-bundle** format (a receipt *is* a bundle + property + signature);
- **`--redact`** soundness proof (selective disclosure for free).

The genuinely new content is narrow: the **receipt record format**, the **authenticity-tier** concept, the **three-layer identity binding**, the **time model**, and the **issue/verify** CLI surface. FSL's bit-identical **total replay** (§15) is the enabling property throughout — it lets a verifier independently recompute "this run satisfies φ," and lets an issuer attest *any submitted tape* by deterministically re-running it.

## 3. Decisions locked in brainstorm (2026-06-24)

| # | Question | Decision |
|---|---|---|
| Q1 | Threat model | **All three** — holder-forgery, issuer-repudiation, *and* third-party portability. A receipt a mutually-distrusting party can verify offline is simultaneously hard to forge and hard to repudiate. |
| Q2 | Execution / authenticity model | **Tiered, evidence-determined**: `replayed` / `hosted` / `witnessed`; the receipt records its tier; `witnessed` is the only tier giving cryptographic (not trust-the-issuer) input authenticity. |
| Q3 | Subject-identity binding | **Layered**: **B** external assertion (default) · **C** holder-of-key (anti-transplant upgrade) · **A** in-tape identity (when φ reasons about identity). Stackable. |
| Q4 | v6 scope/ambition | **B — spec fully now, ship the `replayed` slice on v6, stage the rest.** Matches how v6 already lands hard things (certificates, `infer`/`synth` aspirational). |

**Binding ergonomic principle (adopted):** *easy default, proportional cost, keyless, one-verb issue / one-verb verify.* Complexity is opt-in and scales only with the trust demanded. The `replayed` tier is free (the tape already exists); climbing tiers costs exactly the authentication you choose to wire and nothing more.

---

## 4. Architecture & positioning

- New megaspec subsection **§25.2**, immediately after the certificate text in §25.1.
- Supplies the run-attestation content of the deferred **§29 Security / effects model** appendix (untrusted-execution + capability-scoping *is* the `witnessed`-tier problem).
- **CLI surface — flags on existing verbs (chosen over a dedicated `attest` verb or a `check` mode):** `run --emit-receipt` mirrors `check --emit-certificate` exactly (issue on the verb that produces the thing), and receipt verification is the same job `verify` already does for certificates (signature + transparency + replay + advisory), so it *extends* rather than duplicates. Rejected alternatives: a dedicated `attest`/`verify-receipt` pair (more verbs, splits "verify"); receipts as a `check --emit-certificate --over-run <tape>` mode (overloads `check`, which is about machines, and muddies the ∀/∃ distinction that makes the model legible).

## 5. The receipt record

A compact, signed header that content-addresses its evidence. **Signed core** (canonical serialization, covered by one keyless signature):

| Field | Meaning |
|---|---|
| `receipt_version` + `edition` | schema / edition for conformance |
| `machine_source_hash` | the machine this is a run *of* |
| `machine_certificate_ref` | hash of that machine's verification certificate — receipt **inherits** "rules proven sound"; a receipt over an uncertified machine is allowed but flagged (`none`) |
| `tape_hash` | content hash of the (possibly redacted) tape bundle |
| `property` φ + `result` | attested predicate (spec property language — Dwyer / temporal / contract expr) and its verdict (`holds` / `reached config C` / `legal-run`) |
| `authenticity_tier` | `replayed` \| `hosted` \| `witnessed` |
| `subject` | identity block (layer B default; optional C `holder_key`; optional A in-tape ref) + `subject_auth` (how the issuer authenticated S) |
| `issuer_identity` | OIDC identity that signed (CI workflow / maintainer / org) |
| `checker_version` + `runtime_version` | what replayed/evaluated it — the revocation targeting key |
| `issued_at` + `transparency_log_ref` | trusted issuance time + append-only inclusion proof (see §10) |

**Optional:** `redaction_map_ref` (selective disclosure), factory `bindings` / `seed` (replay determinism), `not_before` / `expires_at` (validity window), `holder_challenge` (anti-replay of presentation), `execution_context` (`hosted` tier), `claim_context` (free metadata, e.g. `"diploma: CS101"`).

**Portability knob:** by default the receipt references artifacts by hash (verifier fetches machine + tape from registry/store); `--bundle` inlines them for fully-offline verification — the same embed-vs-reference choice repro-bundles already expose.

**Two verification strengths** (inherited from the certificate's trust-or-re-run posture):

- **Cheap** — signature + identity + transparency-log inclusion + well-formedness of the tier/φ claim + revocation feed. Trusts the issuer's replay. Milliseconds.
- **Full** — additionally **re-replay the tape against machine@`hash` and recompute φ**. Recomputable *because* replay is bit-identical — this is what turns "∃ this run satisfies φ" from assertion into something a mutually-distrusting party confirms independently. For `witnessed`, full verification also checks per-input provenance signatures.

## 6. Issuance & the authenticity tiers

**Issuance is structurally a `check`, then a signature.**
`run <tape> --emit-receipt --property <φ> [--subject S]` loads machine@`hash` + its certificate, replays the tape deterministically, evaluates φ, and **mints a receipt only if φ's verdict is affirmative**. A false claim cannot be issued — the tool refuses, exit-nonzero, with the counterexample, exactly like a failed `check`. *"Issue a receipt"* therefore **means** *"prove this run satisfies φ, then sign the proof."* That refusal is the integrity backbone. Signing is keyless via the issuer's OIDC identity; transparency-log entry is automatic.

**Tier is produced by the evidence present, never hand-asserted** — the anti-forgery keystone:

- **`replayed`** *(v6 slice)* — "A legal run of machine@`hash` reaching φ exists; I replayed it and attach subject label S." Input authenticity: none. Produced from any submitted tape. The floor — cheap because total-replay already exists.
- **`hosted`** — "This run executed inside my controlled environment; I owned the tape from birth." Produced when the issuer's own server/`run` drives execution under an authenticated session; records `execution_context`. Legality stays re-replayable by anyone; *input* authenticity rests on issuer integrity (not independently checkable by construction).
- **`witnessed`** *(strongest)* — "Each input was authenticated at capture time." The tape is a **chain of signed input events** (per-stimulus `provenance`: subject session token / device attestation / counterparty signature). A mutually-distrusting verifier independently checks every input signature *and* re-replays. The only tier giving cryptographic — not trust-the-issuer — input authenticity.

**No tier inflation.** Requesting `witnessed` over a bare tape is an error naming the missing evidence; the tier is whatever the present evidence supports. Capping downward (emit `replayed` despite stronger evidence) is allowed. This is what stops a holder *or* issuer claiming stronger provenance than they hold.

**Tape-format touch:** the `witnessed` tier needs an optional per-stimulus `provenance` field — an additive §15 tape extension, **specced now, implemented when `witnessed` ships**. The `replayed` slice does not touch the tape format.

## 7. Verification, trust & revocation

`fsl verify <receipt|dir|lockfile>` extends the existing dependency-sweep `verify` (no new verb). It walks the trust chain and emits one green/red verdict plus structured `--json`. The chain *is* the complete trust sentence:

1. **Signature & identity** — verify keyless signature, resolve the OIDC issuer, confirm transparency-log inclusion proof → *"signed, by this identity, logged at T."*
2. **Machine certificate** — resolve `machine_certificate_ref`, confirm it covers `machine_source_hash`, confirm unrevoked → *"the rules this run obeys are themselves proven sound."*
3. **Replay** *(full strength)* — re-run the tape against machine@`hash`; confirm legal run and that φ's verdict matches → *"this run really does satisfy φ,"* recomputed not trusted.
4. **Tier evidence** — `witnessed`: verify every per-input provenance signature; `hosted`: record input-authenticity as issuer-trusted; `replayed`: nothing to check.
5. **Identity binding** — B: issuer's signed subject assertion; C: holder proves key-possession at presentation (fresh challenge); A: confirm φ references the in-tape identity.
6. **Revocation & advisories** — consult the shared RustSec/GHSA-shaped feed: `checker_version`/`runtime_version` flagged? issuer or this receipt revoked? machine cert pulled?
7. **Validity window** — check `not_before` / `expires_at` if present.

**Output is the assembled sentence**, e.g.: *"φ holds over this run of machine@`hash` (rules certified), signed by ‹issuer›, logged at T, authenticity: witnessed (12/12 inputs verified), bound to subject S, not revoked."* Any broken link → red, naming the specific failure. A single `verify <receipt>` defaults to **full**; `--cheap` skips replay; bulk/lockfile sweeps default cheap with `--full` on demand.

**Offline:** with `--bundle` receipts, steps 1–5 and 7 are fully offline (the log *inclusion proof* is self-contained; machine + tape inlined; replay is local). Only step 6 needs network for *freshness*, and it degrades gracefully — verifies offline with a *"revocation status as of ‹cached date›"* caveat, never a hard fail (CRL/OCSP-style).

**Non-repudiation falls out of the transparency log** (threat model: issuer-repudiation): append-only inclusion + trusted time means an issuer cannot later deny or backdate. **The weakest link is always the authenticity tier** — which is precisely why it is explicit, uninflatable, and surfaced in the verdict rather than buried.

## 8. Identity binding (three stackable layers)

- **B — external assertion (default).** `subject` carries an identifier (DID / email / org handle / pubkey) plus `subject_auth` recording *how* the issuer authenticated it (`oidc` / `email-verified` / `asserted`). Strength = the issuer's authentication quality, stated honestly. Most issuers already know their logged-in user — the easy path.
- **C — holder-of-key (anti-transplant upgrade).** Binds a **public key the subject controls**; *presenting* the receipt requires answering a fresh challenge with the private key, so a leaked receipt is useless to a thief. Cost: subject needs a passkey/wallet. Opt-in for diplomas, licenses, high-value credentials.
- **A — in-tape identity (when φ is *about* identity).** The machine models identity in a slot the run carries, and φ references it (`ensure approver in managers`). Used when the attested property is itself an identity claim. Composes with B/C.

A maximal diploma is **A+B+C**; a throwaway agent receipt is **B-only or `subject: none`** ("*a* legal run reached φ, no who").

## 9. Selective disclosure (with an honest boundary)

A receipt over a `--redact`'d tape pseudonymizes behavior-irrelevant vals while **still replaying bit-identically** (the existing soundness proof). You attest φ while hiding fields φ does not read: prove "completed CS101" without exposing every answer; "KYC passed" without PII in the receipt. The verifier-emitted redaction map *flags load-bearing fields* — you **cannot** redact a field φ depends on (it would fail to re-replay), so disclosure is bounded exactly by what the claim needs. Provable, not best-effort.

**Named limit:** *predicate* disclosure that hides the input a predicate reads — "prove `age ≥ 18` while hiding the birthdate" — works only at **cheap** verification strength (trust the issuer's replay). At **full** strength the verifier must re-replay, which needs that input. Squaring "hide the secret" with "independent recomputation" is what **zero-knowledge proofs** do in mature credential systems, and that is **out of scope for v6** — recorded as a future §29 door, not built now. v6's selective disclosure = "hide what the claim doesn't depend on," which is already most of the value.

## 10. Time model

Two distinct times; conflating them is the classic credential bug.

1. **Issuance time** (`issued_at`) — *when the attestation was signed.* Cryptographically trusted for free from the **transparency log** (RFC 3161 / Sigstore-Rekor-style signed time). The **anti-backdating anchor**: an issuer cannot claim they attested earlier or later than the log says. Always present, always trusted.
2. **Event time(s) inside the run** — *when the attested behavior happened.* **As trustworthy as the authenticity tier, no more.** At `replayed`, wall-clock times in the tape are self-asserted by whoever built it — untrusted. At `witnessed`, each input's provenance signature can carry a **trusted capture time**, making "this step happened at T" independently verifiable. A claim like *"completed before the window closed"* is honest only at `witnessed`; the receipt must refuse to present an event-time as trusted when the tier can't back it.

Plus an optional **validity window** (`not_before` / `expires_at`) on the receipt itself, distinct from both; and for **layer-C presentations**, a nonce + presentation time so an old presentation can't be replayed.

**Principle — *the proof is timeless; the attestation is timestamped.*** FSL's entire trust story rests on **bit-identical replay**, which is deliberately wall-clock-independent — if real time entered the replayed computation, replay would be non-deterministic and nothing would verify. So **time never enters replay**; it lives entirely in the signed *envelope* (receipt header, transparency-log entry, input-provenance records), with its trust graded exactly the way authenticity is.

---

## 11. v6 scope boundary (the Q4-B decision, concrete)

| Ships in v6 — the `replayed` slice | Specced now, staged to later editions |
|---|---|
| Full receipt **record format** (all tiers representable) | `witnessed` tier + per-stimulus `provenance` tape extension + input-sig verification |
| `run --emit-receipt` minting **`replayed` only** (replay + φ-gate + sign + log) | `hosted` tier + `execution_context` |
| `fsl verify` full chain for `replayed` (sig, cert, replay, B-identity, revocation, offline) | Layer **C** holder-of-key + presentation challenge |
| Layer **B** identity + redaction composition + `inspect` receipt reader | Layer **A** in-tape identity convention |
| `issued_at` (trusted) + `not_before`/`expires_at` | Trusted **event** time (rides with `witnessed`) |
| §25.2 spec text + §29 run-receipts appendix content | ZK predicate disclosure (future §29 door; may never) |

The slice is useful standalone — agent-to-agent trust currency, supply-chain run-gates, basic compliance receipts — while diploma-grade `witnessed` + holder-key stage in without inflating the v6 release.

## 12. CLI surface

All inheriting the agent-verb contracts (`--json`, non-interactive-total, meaningful exit codes, `suggested_fix`):

- **Issue:** `run <tape> --emit-receipt --property <φ> [--subject S] [--subject-auth m] [--holder-key k] [--bundle] [--redact] [--out f]`. φ inline or a named Dwyer pattern. Refuses (exit-nonzero, with counterexample) if φ fails.
- **Verify:** `fsl verify <receipt|dir|lockfile>` — single receipt defaults to **full** (re-replay); `--cheap` skips replay; bulk/lockfile sweeps default cheap, `--full` on demand; `--offline` skips revocation freshness with a caveat.
- **Read:** `inspect <receipt>` shows the assembled trust sentence, tier, subject, and what's redacted *without* doing crypto — "what does this claim."
- Receipts participate in `fsl.lock` / `verify` sweeps — a project can pin "these receipts must stay valid."

## 13. Error handling

Every failure names itself:

- φ fails → no receipt, exit-nonzero, structured reason + counterexample.
- Tier inflation requested → error naming the missing evidence.
- Uncertified machine → receipt allowed but `machine_certificate_ref: none`; verify **warns** (you attest the run; you just don't inherit "rules proven").
- Redacting a load-bearing field → error naming the field from the redaction map.
- Verify failure → the specific broken link (bad signature / cert revoked / replay-divergence at step N / input-provenance fail at input K / holder-challenge fail / expired / advisory-revoked).
- Offline + revocation feed unreachable → verify succeeds with explicit staleness caveat, not a hard fail.

## 14. Testing (per repo conventions — split spec/stoch, no golden/snapshot)

- **Spec suite:** issue→verify round-trip for `replayed`; φ-gate refusal; tier-inflation refusal; uncertified-machine flag; redaction soundness (redacted receipt still verifies; load-bearing redaction rejected); tamper detection (mutate `tape_hash`/φ/`subject` → signature fails); transparency-log inclusion; offline staleness caveat.
- **Stochastic suite:** random machine + random tape + random φ → issue receipts → **receipt-verify must agree with a direct `check` of φ over that run** (the cross-check that proves it is not a fake test — verifies behavior, not a precomputed expectation). Seeded tamper injection must *always* be caught.
- Doctests from `@example` on the public entry points.

## 15. Open questions / future doors

- **ZK predicate disclosure** — hide-the-input-but-prove-the-predicate to a distrusting verifier. Needs a ZK backend; future §29 door, may never.
- **`hosted` `execution_context` format** — what environment attestation looks like (TEE quote? signed deployment identity?) — designed when `hosted` is implemented.
- **Receipt chaining / composition** — a system receipt from member receipts (mirrors the certificate composition story in §23: member certs + composition cert = system cert). Likely the natural follow-on once `witnessed` exists.
- **Revocation of a *single* receipt** (vs. a checker-version sweep) — the issuer-initiated "I retract this attestation" path; shares the certificate revocation feed, exact UX TBD with the staged tiers.
