---
title: "aio-threat-models"
description: "Chọn và áp dụng đúng framework threat-modeling — STRIDE, LINDDUN, PASTA, MITRE ATT&CK/ATLAS, Attack Trees và 22 cái khác — cho phân tích rủi ro bảo mật, quyền riêng tư và AI/ML."
document_type: "plugin"
version: "1.0.2"
install: "/plugin install aio-threat-models@aiocean-plugins"
skills_count: 1
---

> **Cài đặt:** `/plugin install aio-threat-models@aiocean-plugins` · `v1.0.2`

# aio-threat-models

Advisor kiến thức threat modeling với semantic search trên 27 framework — STRIDE, LINDDUN, PASTA, OCTAVE, Attack Trees, MITRE ATT&CK/ATLAS, Kill Chain, NIST AI RMF, OWASP LLM Top 10, và nhiều hơn nữa.

## Đây là gì

Một **knowledge skill** (theo phong cách `aio-mental-models`) mà:

1. **Tổng hợp 27 framework threat modeling** trên 7 volume — mỗi cái có file markdown riêng bao quát nguồn gốc, cấu trúc, khi nào dùng, điểm mạnh, hạn chế, quan hệ liên framework và trích dẫn primary-source.
2. **Embed semantic search** qua embedding pre-computed (snowflake-arctic-embed-xs, chạy local, không cần API key).
3. **Hướng dẫn chọn framework, áp dụng và kết hợp liên framework** qua workflow 5 bước (ASK → SEARCH → APPLY → COMPOSE → CHALLENGE).

## Phạm vi (7 Volume, 27 Framework)

| Volume | Framework |
|---|---|
| 1. Foundations | Shostack 4Q, DFD + Trust Boundaries, Threat Modeling Manifesto |
| 2. Core Frameworks | STRIDE, DREAD, PASTA, OCTAVE Allegro, Trike, VAST |
| 3. Attacker-centric | Attack Trees, Persona non Grata, Security Cards, hTMM |
| 4. Attack Patterns | Lockheed Martin Kill Chain, Unified Kill Chain, MITRE ATT&CK, Diamond Model, CAPEC |
| 5. Privacy | LINDDUN, GDPR DPIA |
| 6. AI/ML | OWASP Top 10 for LLM, MITRE ATLAS, NIST AI RMF, NIST AI 100-2 |
| 7. Cloud & DevSecOps | Cloud Threat Modeling, Kubernetes Threat Matrix, Continuous Threat Modeling |

## Triggers

"threat model", "STRIDE", "LINDDUN", "PASTA", "MITRE ATT&CK", "attack surface", "privacy review", "DPIA", "adversarial ML", "secure architecture review", "which framework", "threat modeling for AI", v.v.

## Scripts

- `list-models.sh` — liệt kê toàn bộ 27 framework, lọc theo volume, tìm theo keyword
- `search-models.ts` — semantic search (cosine similarity với embedding pre-computed)
- `build-embeddings.ts` — rebuild `embeddings.json` sau khi nội dung thay đổi

## Acknowledgment

Cấu trúc và pattern semantic search được phỏng theo `aio-mental-models`. Nội dung tổng hợp từ primary source: NIST, CMU/SEI, OWASP, MITRE, Microsoft SDL, Threat Modeling Manifesto, bài báo peer-reviewed (Scandariato 2015, Tuma 2018, Xiong 2019).

## Skills (1)

- [**aio-threat-models**](/vi/plugins/aio-threat-models/aio-threat-models) — Advisor framework threat modeling — chọn, áp dụng và kết hợp các framework (STRIDE, LINDDUN, PASTA, MITRE ATT&CK/ATLAS, Attack Trees, v.v.) cho phân tích bảo mật, quyền riêng…
