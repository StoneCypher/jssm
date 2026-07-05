# v14 — The Trusted Machine (one page)

**Mission:** proofs and runs become portable, signed, revocable social objects — the currency
of an economy where humans and agents exchange machines.

**Gate:** a **security-adversarial review** before the spec hardens (the PROCESS amendment,
security-lensed reviewer). Known unexamined surfaces on record: transparency-log
equivocation/split-view (needs witness cosigning or equivalent), OIDC provider compromise as
the keyless root, single-receipt revocation UX.

**Contents (~11 inherited; the review + receipts design carry the rest):** **M2** sigstore-
style keyless signing bound to OIDC identity; the **transparency log** (append-only,
inclusion proofs, trusted time — hardened per the review); revocation + the RustSec/GHSA-
shaped **advisory feed** (checker-CVE sweeps: "re-certify these"); **M5 `verify`** — the full
chain (signature → cert validity → replay → tier evidence → identity → revocation → window),
cheap vs full strengths, offline with staleness caveat; **M6 receipts** through the tier
ladder — `replayed` slice first, then `hosted` + `witnessed` (per-stimulus provenance tape
extension), layer-B/C/A identity, holder-key presentations, trusted event time; **fsl.lock**
(schema = irreversibles #18) + lockfile sweeps; redaction-with-proof at sharing scale;
refinement certificates in anger; registry entry format finalized (hosting stays v16).

**Doctrine to preserve verbatim:** issuance is check-then-sign (a false claim cannot be
minted); tiers are evidence-determined and uninflatable; *the proof is timeless, the
attestation is timestamped* (time never enters replay).

**Exit:** a mutually-distrusting third party verifies a receipt offline and independently
re-derives its claim; a checker CVE identifies and re-certifies its blast radius via the log.

**Milestone:** fsl #57. **Sources:** eras-2-to-7 brief (era 5); receipts design + roadmap
(M2/M5/M6); W10.1–.10.
