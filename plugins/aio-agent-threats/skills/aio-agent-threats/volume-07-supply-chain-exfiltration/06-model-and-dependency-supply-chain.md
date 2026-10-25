# Model & Dependency Supply Chain

> "Versions 1.0.0–1.0.15 were copies of the legitimate code. Version 1.0.16 added one line that blind-copied every outgoing email to an external address."
> — paraphrasing Koi Security's analysis of the malicious `postmark-mcp` npm package, September 2025

## Core Concept

An AI agent's trust boundary extends far below its own code: the **model weights** it loads, the **datasets** those weights were trained on, the **MCP servers and plugins** it connects to, and the **ordinary package dependencies** (npm/PyPI) of all of the above. Each is a supply-chain surface, and each has been hit in 2025:

- **Malicious model weights** on Hugging Face that execute code on load via **pickle deserialization** (nullifAI, Feb 2025), evading the platform's scanner.
- **Typosquatted / trojanized MCP servers** — `postmark-mcp` (Sept 2025), the first publicly documented malicious MCP server, which built trust across 15 clean releases then added a BCC backdoor.
- **Poisoned datasets** (split-view / domain-expiry poisoning) and tampered models (e.g., the 2023 "PoisonGPT" demonstration) that embed behavior without touching the running code.

The defining risk: these artifacts are pulled with high trust (an MCP server runs with the host's privileges; a model file is deserialized into the process; a dependency runs `postinstall`), and the malicious behavior is either invisible (it *is* the weights/data) or quietly introduced after a reputation is built.

## Origin / First Seen (URLs/CVE)

- **nullifAI** (ReversingLabs, ~10 Feb 2025): two malicious models on Hugging Face bypassed Picklescan. https://www.reversinglabs.com/blog/rl-identifies-malware-ml-model-hosted-on-hugging-face ; Help Net Security https://www.helpnetsecurity.com/2025/02/10/malicious-ml-models-found-on-hugging-face-hub/ (HIGH)
- **`postmark-mcp` malicious MCP server** (Koi Security; ~25–29 Sept 2025): first publicly documented malicious MCP server. The Register https://www.theregister.com/security/2025/09/29/fake_postmark_mcp_npm_package_stole_emails_with_one_liner/ ; Snyk https://snyk.io/blog/malicious-mcp-server-on-npm-postmark-mcp-harvests-emails/ ; Dark Reading https://www.darkreading.com/application-security/malicious-mcp-server-exfiltrates-secrets-bcc (HIGH)
- **Pickle/deserialization risk** — long-standing; HF `safetensors` exists specifically to avoid it; CWE-502 (Deserialization of Untrusted Data). (HIGH)
- **PoisonGPT** (Mithril Security, 2023): PoC of a surgically edited model distributed via a lookalike HF namespace to spread targeted misinformation. (MEDIUM — demonstration)
- **Nx `s1ngularity`** (Aug 2025) — the npm-dependency layer in action (see [[01-coding-agent-weaponization-nx]]). (HIGH)

## How It Works (attack chains, step-by-step)

### A. Malicious model weights (pickle RCE) — nullifAI
1. PyTorch `.bin`/`.pt` model files are **compressed pickle streams**. Pickle `__reduce__` can execute arbitrary code **at deserialization/load time**, before the model is ever used for inference. (HIGH — CWE-502)
2. Attacker embeds a malicious `__reduce__` payload in the pickle. (HIGH)
3. **Scanner evasion:** nullifAI compressed the files with **7z instead of ZIP**, so PyTorch could not load them normally and **Picklescan failed to reach/parse the payload** — yet the malicious code still ran before the (broken) load completed. HF did not flag the models as unsafe. (HIGH)
4. Victim `from_pretrained()` / `torch.load()` the model → code executes in the agent/host process. (HIGH)
5. The two found models looked like PoC tests, not typosquats of popular models; HF disabled them post-disclosure. Picklescan has other documented bypasses, and HF historically **flags but does not block** downloads of unsafe models. (HIGH)

### B. Trojanized / typosquatted MCP server — postmark-mcp
1. Attacker publishes an npm package impersonating Postmark's official MCP connector (name matched Postmark's; sources differ on whether it's an exact-name impersonation or a typosquat). (MEDIUM on classification)
2. **Trust build-up:** versions 1.0.0–1.0.15 are faithful copies of Postmark's real GitHub code — credible, functional. (HIGH)
3. **Backdoor drop:** version **1.0.16** (~25 Sept 2025) adds **one line that BCCs every outgoing email to an attacker-controlled address**. (HIGH)
4. AI assistants that wired in the "Postmark MCP server" now silently leak all mail the agent sends. MCP servers run via `npx`/`uvx` **inherit the host's privileges** (filesystem, env vars, network). (HIGH)
5. **Scale:** ~1,500 downloads in a week, integrated into "hundreds" of developer workflows; publisher was an individual (Postmark itself not breached); package deleted after contact. (MEDIUM — Koi estimate)

### C. Dataset / model poisoning (no code needed)
1. Attacker influences training data (split-view poisoning: serve benign content to crawlers, malicious later; or buy expired domains that were in a dataset's URL list) or **surgically edits weights** (PoisonGPT) to embed a backdoor/misinformation. (MEDIUM — demonstrated classes)
2. The downstream model behaves normally except on the trigger, with **no malicious code** to scan. (MEDIUM)
3. Distributed via a lookalike HF namespace / namespace-reuse so victims pull the tampered artifact. (MEDIUM)

### Why pickle is dangerous (and safetensors is not)

Python's `pickle` is a *stack-based program*, not a passive data format. During unpickling, the `__reduce__` method of any object can specify a callable and arguments to run — e.g. `(os.system, ("curl … | sh",))` — which execute **as the file is read**, before and independent of any model inference. PyTorch's default `.bin`/`.pt` serialization is pickle, so `torch.load(untrusted)` is remote code execution by design. **`safetensors`** stores only raw tensor bytes plus a JSON header with no code path, which is why it is the recommended format and why "convert to safetensors and refuse pickle" is the single highest-leverage control for model supply chain. (HIGH — CWE-502)

### Trust-then-backdoor: the reputation attack

`postmark-mcp` shows a pattern that evades point-in-time review: publish many **clean, functional** versions (1.0.0–1.0.15, faithful copies of real code) to earn adoption, stars, and lockfile entries, then slip the payload into a later minor bump (1.0.16, one BCC line). Anyone who audited an early version, or who trusts "it's been fine for 15 releases", is now backdoored by an auto-update. The defense is not one-time vetting but **version pinning + review of every bump + behavior-delta scanning** between versions.

### Format / artifact risk (reference)

| Artifact | Risk | Safer alternative |
|---|---|---|
| `.bin` / `.pt` / `.pkl` model | pickle RCE on load | `safetensors` |
| `.h5` / Keras Lambda layers | embedded code execution | avoid Lambda; vet layers |
| npm/PyPI MCP server | `postinstall`/`npx` RCE, backdoor bump | pin + provenance + sandbox |
| Fine-tune dataset w/ URL list | split-view / domain-expiry poisoning | immutable snapshot, trusted source |
| Model with edited weights | backdoor in weights, no code to scan | provenance, behavioral eval |

## Attack Surface & Preconditions

- Agents/pipelines that `torch.load`/unpickle models from public hubs without `safetensors` or sandboxing. (HIGH)
- Agents that install MCP servers/plugins/dependencies from registries without pinning, provenance, or review; `postinstall`/`npx`/`uvx` run with host privileges. (HIGH)
- Platform scanners that can be evaded (compression tricks, `__reduce__` obfuscation) and that **flag but do not block**. (HIGH)
- Trust-on-first-use for model/MCP identities; reputation built then abused in a later version. (HIGH)

## Weaponization (Authorized Lab)

Owned registry/VM, synthetic payloads only.

1. **Pickle-load PoC:** build a lab model file whose pickle `__reduce__` writes `LAB-PICKLE-OK` to `/tmp` (no network, no harm). `torch.load` it in a sandboxed VM; confirm code runs **before** inference. Re-save as `safetensors` and confirm the payload cannot ride along.
2. **Scanner-evasion study:** compress the lab pickle with 7z vs ZIP; run Picklescan/ModelScan on both; record which is flagged. Demonstrates the nullifAI gap.
3. **Trojanized-MCP PoC:** in a private registry, publish a benign MCP server at v1.0.0–1.0.3, then v1.0.4 that logs (not exfiltrates) a canary to a local file. Wire it into a disposable agent; confirm the "trusted" update silently changes behavior. Test a lockfile/pin + review gate that blocks the bad version.
4. **Provenance drill:** verify Sigstore/npm-provenance/attestation on each artifact; prove an unsigned/typosquatted package is rejected by policy.
5. **Dataset-poison analogue:** train a tiny lab model with a single trigger pattern; show normal behavior off-trigger and backdoor on-trigger; confirm no code scanner detects it (it's in the weights) — motivating data provenance.

## Real-World Instances

| Instance | Date | Layer | Detail | Confidence |
|---|---|---|---|---|
| nullifAI | Feb 2025 | model weights | 7z-compressed pickle evades Picklescan; RCE on load | HIGH (ReversingLabs) |
| postmark-mcp | Sept 2025 | MCP server (npm) | v1.0.16 BCC backdoor; first documented malicious MCP server; ~1,500 dls | HIGH (Koi, Register, Snyk) |
| Nx s1ngularity | Aug 2025 | npm dependency | postinstall weaponized AI CLIs | HIGH |
| PoisonGPT | 2023 | model weights/data | surgically edited model via lookalike HF namespace (PoC) | MEDIUM (demo) |
| Picklescan bypasses | 2024–2025 | tooling | multiple documented evasions; HF flags, not blocks | HIGH |

## Detection Signals

- Model files that are **pickle-based** (`.bin`/`.pt`/`.pkl`) rather than `safetensors`, especially with unusual compression (7z) or that fail normal load but still spawn processes. (HIGH)
- A model load (`torch.load`) spawning child processes / making network calls. (HIGH)
- An MCP server/dependency update that **adds network egress, BCC, or env-var reads** not present in prior versions; large behavior delta between minor versions. (HIGH)
- Packages whose early versions mirror a known-good repo then diverge (reputation-then-backdoor). (MEDIUM)
- Typosquatted / recently-published MCP/plugin names impersonating official connectors. (MEDIUM)

## Mitigations / Hardening

- **Prefer `safetensors`; never unpickle untrusted models.** If pickle is unavoidable, load in a sandbox with no network/secrets. (breaks chain A) (HIGH)
- **Scan with ModelScan/Picklescan but do not trust a pass** — combine with sandboxed load and provenance. (HIGH)
- **Pin + review MCP servers/plugins/dependencies**; lockfiles, `npm ci`, delayed-adoption windows; verify provenance/attestations (Sigstore, npm provenance). (breaks B) (HIGH)
- **Least privilege for MCP/plugins:** run with scoped filesystem/network/env, not host-ambient; broker and audit tool calls (see Vol 3). (HIGH)
- **Vendor identity verification** for connectors — install official MCP servers from the vendor's canonical source, not a registry name match. (HIGH)
- **Data provenance** for training/fine-tuning: trusted sources, immutable snapshots, poisoning detection; assume datasets with URL lists are poisonable via domain expiry. (MEDIUM)
- **Egress monitoring** to catch load-time or runtime beacons. (MEDIUM)

### Defense-in-depth: which control breaks which chain

| Control | Breaks chain |
|---|---|
| `safetensors` only; refuse pickle | A (no code path on load) |
| Sandboxed model load (no net/secrets) | A (payload runs but can't reach anything) |
| ModelScan/Picklescan + sandbox (not scan alone) | A (closes the nullifAI evasion gap) |
| Version pinning + per-bump review | B (backdoor bump not auto-adopted) |
| Provenance/attestation (Sigstore, npm provenance) | A, B (typosquat/unsigned rejected) |
| Least-privilege MCP (scoped fs/net/env) + broker | B (BCC/egress blocked and audited) |
| Vendor-canonical install, not name match | B (impersonation rejected) |
| Data provenance + immutable snapshots | C (poisoned dataset not ingested) |

### Key reference facts

- First publicly documented **malicious MCP server**: `postmark-mcp`, v1.0.16, ~25 Sept 2025, ~1,500 downloads. (HIGH)
- nullifAI: **7z-compressed pickle** bypassed Picklescan; HF **flags but does not block** unsafe models. (HIGH)
- MCP servers via `npx`/`uvx` inherit **host privileges** (fs, env, net). (HIGH)

## Related Vectors

- [[01-coding-agent-weaponization-nx]] — the npm dependency layer, weaponizing agents.
- [[05-anthropic-espionage-case]] — MCP as the orchestration/tool layer at operation scale.
- Vol 3 — MCP tool-poisoning internals (server-side prompt/tool manipulation) — cross-link, not repeated here.
- [[03-data-exfiltration-channels]] — where a trojanized MCP server sends the data.

## References

- ReversingLabs nullifAI — https://www.reversinglabs.com/blog/rl-identifies-malware-ml-model-hosted-on-hugging-face (HIGH, primary)
- Help Net Security (nullifAI) — https://www.helpnetsecurity.com/2025/02/10/malicious-ml-models-found-on-hugging-face-hub/ (MEDIUM)
- The Register, fake Postmark MCP — https://www.theregister.com/security/2025/09/29/fake_postmark_mcp_npm_package_stole_emails_with_one_liner/ (HIGH)
- Snyk, postmark-mcp — https://snyk.io/blog/malicious-mcp-server-on-npm-postmark-mcp-harvests-emails/ (HIGH)
- Dark Reading, "Exfiltrates Secrets via BCC" — https://www.darkreading.com/application-security/malicious-mcp-server-exfiltrates-secrets-bcc (MEDIUM; Koi findings, v1.0.0–1.0.16)
- CWE-502 Deserialization of Untrusted Data (HIGH, taxonomy)
- Mithril Security, PoisonGPT (2023) (MEDIUM, demonstration)
- CSO Online, "squatted Postmark connector" — https://www.csoonline.com/article/4064009/trust-in-mcp-takes-first-in-the-wild-hit-via-squatted-postmark-connector.html (MEDIUM)
- Infosecurity Magazine, nullifAI — https://www.infosecurity-magazine.com/news/malicious-ai-models-hugging-face/ (MEDIUM)

## Appendix: the agent's full trust radius

An agent does not just trust its own code. Enumerated outward, its supply chain is:

1. **Model weights** — unpickled into the process (RCE surface).
2. **Training/fine-tune data** — shapes behavior without any code (poisoning surface).
3. **MCP servers / plugins / tools** — run with host privileges (backdoor + exfil surface).
4. **Ordinary dependencies** of all of the above — npm/PyPI `postinstall`, transitive packages (the Nx surface).
5. **Rules/config files** the agent ingests (the [[02-repository-poisoning]] surface).

A review that covers only layer 4 ("we scan our npm deps") leaves layers 1–3 and 5 wide open. This volume's recurring lesson: the agent's trust boundary is wider than its codebase, and each layer needs its own provenance and least-privilege story. The cheapest wins are `safetensors`-only (layer 1), pinned+reviewed MCP/deps (layers 3–4), and normalize-on-ingest for config (layer 5).
