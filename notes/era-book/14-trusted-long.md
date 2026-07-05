# v14 — The Trusted Machine (long form)

**Security-adversarial review (gate, first deliverable).** *Manager:* The trust stack has had
logic review but never a hostile one; before M2's spec hardens, a security-lensed pass attacks
the known soft spots. Its findings amend the receipts design. *CS:* agenda on record:
transparency-log split-view/equivocation (mitigation: witness cosigning or gossip; offline
inclusion proofs alone can't detect forks), OIDC-provider compromise as keyless root,
single-receipt revocation, presentation replay; PROCESS amendment satisfied (external
specialist gate).

**M2: signing + log + advisories.** *Manager:* Certificates get identities: keyless signing
bound to who ran the check, an append-only public log making claims tamper-evident, and an
advisory feed so a checker CVE identifies its whole blast radius for re-certification. *CS:*
sigstore-style OIDC keyless (CI workflow / maintainer identities); Rekor-or-self-hosted log
(decision from the brainstorm), inclusion proofs self-contained for offline; advisory feed
RustSec/GHSA-shaped, keyed by checker/runtime version; `fsl login` local vs CI-OIDC flows.

**M5: `verify` — the trust chain.** *Manager:* One verb walks the whole sentence: signed by
whom, logged when, rules certified, run recomputed, revocations checked — cheap mode trusts
the issuer's replay in milliseconds, full mode re-derives everything. *CS:* chain per receipts
§7 (sig→identity→log inclusion→cert covers hash→replay(full)→tier evidence→identity binding
→revocation→window); `--cheap|--full|--offline` (offline: staleness caveat, never hard-fail);
lockfile/dir sweeps default cheap; exit codes per class.

**M6: receipts, full ladder.** *Manager:* Attestations about single runs: "this run of
machine@hash satisfied φ, at this authenticity tier, for this subject." Diplomas, compliance
gates, agent-to-agent trust — with tiers that cannot be inflated because evidence produces
them. *CS:* record per receipts §5 (signed core + optional bundle); issuance = replay + φ-gate
+ sign (false claims unmintable); tiers: `replayed` (v13's ledger makes hooked machines
attestable) → `hosted` (execution_context) → `witnessed` (per-stimulus provenance sigs, the
additive tape extension); identity layers B external / C holder-key + fresh-challenge
presentations / A in-tape; trusted event-time only at witnessed; selective disclosure =
redaction map (predicate-hiding = ZK, explicitly out, §29 door).

**fsl.lock + ecosystem plumbing.** *Manager:* Reproducible system builds: every registry
member pinned to source hash + certificate + edition, sweepable in CI — the supply-chain
keystone specced before the first incident instead of after. *CS:* schema (irreversibles
#18): members[{name, source_hash, certificate_ref, edition, resolved_path}], lock-verify in
`verify` sweeps; receipts participate ("these receipts must stay valid"); refinement
certificates flow through upgrades; registry ENTRY format final (publish bundle = entry;
hosting stays v16).
