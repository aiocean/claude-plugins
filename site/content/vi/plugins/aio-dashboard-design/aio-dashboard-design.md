---
title: "aio-dashboard-design"
description: "Design and review SaaS analytics dashboards — chart selection, anti-pattern detection, WCAG 2.2 accessibility, data-ink discipline, color palettes, and storytelling. Use as both design reference and review standard."
document_type: "skill"
plugin: "aio-dashboard-design"
install: "/plugin install aio-dashboard-design@aiocean-plugins"
---

> From plugin [**aio-dashboard-design**](/vi/plugins/aio-dashboard-design) · `v1.0.2` · **Install:** `/plugin install aio-dashboard-design@aiocean-plugins`

# SaaS Dashboard Design Advisor

> *"Above all else show the data. Maximize the data-ink ratio."*
> — Edward Tufte, *The Visual Display of Quantitative Information* (1983, p. 105)

> *"The annotation layer is the most important thing we do… otherwise it's a case of here it is, you go figure it out."*
> — Amanda Cox, NYT Upshot (2012)

Skill này tổng hợp ~60 năm nghiên cứu visualization (Bertin 1967, Tufte 1983, Cleveland–McGill 1984, Few 2006, Munzner 2014, Shneiderman 1996, Knaflic 2015, Cairo 2016, Segel–Heer 2010), UX thực nghiệm của Nielsen Norman Group, accessibility theo WCAG 2.2 + Chartability (Elavsky 2022), hướng dẫn từ IBM Carbon / Shopify Polaris / Atlassian / Material / Fluent, và pattern sản phẩm của Stripe, Linear, Vercel, Datadog, Shopify Admin, Plausible, GitHub.

**Dùng nó như cả design reference (để làm dashboard tốt) lẫn review standard (để chặn dashboard tệ trước khi ship).**

---

## Workflow: 5-Step Review / Design Loop

Khi skill này trigger, **KHÔNG** dump toàn bộ principle. Luôn apply vào surface cụ thể của user. Tuân thủ 5 bước.

### Step 1 — UNDERSTAND: Audience & Surface

Hỏi chỉ những gì còn thiếu:

- **Ai đọc cái này?** Executive (strategic), Analyst (exploratory), Front-line/NOC (operational), hoặc mixed audience?
- **Big Idea là gì?** Một câu hoàn chỉnh: *viewpoint + so what + implied action*. Nếu user không viết được câu đó → **redesign, đừng debate pixel**. (Knaflic/Duarte.)
- **Surface type?** Strategic / Analytical / Operational (Few taxonomy). Chi tiết: `references/design-guidelines.md` §3.1.
- **Mode?** **Explanatory** (home, exec summary, email digest — author-driven) hay **exploratory** (analyst workbench, segment explorer — reader-driven). Nếu mixed → đề xuất **Martini Glass** (Segel–Heer 2010).
- **Constraint check:** mobile? real-time? WCAG AA bắt buộc? dark mode? locale Đông Á?

Nếu user đã cung cấp đủ context, skip sang Step 2.

### Step 2 — SELECT: Pick Principles & Chart Types

Map problem của user vào:
- Principles (§ *10 Core Principles* bên dưới).
- Chart types (§ *Chart Selection Matrix*).
- Routing table (§ *Routing Table*).

Tuyên bố lựa chọn + **vì sao** — dựa trên Cleveland–McGill ranking (position > length > angle/area > color), không phải *"nhìn đẹp"*. Nếu recommend bar chart, nêu rõ: *"length channel đứng thứ 3 trong ranking perceptual accuracy — chính xác hơn angle (pie) và area (bubble) 1 bậc"*.

### Step 3 — APPLY: Walk Through Each Principle / Choice

Với mỗi principle / chart chọn:
- **State** principle trong một câu.
- **Map** vào surface/widget cụ thể của user (file name, component name).
- **Cite** evidence: researcher, study, design system, principle #.
- **Rewrite** cụ thể — đưa token, code, anatomy mới.

Không paraphrase từ memory. Khi cần depth → đọc `references/research-foundations.md` hoặc `references/design-guidelines.md` và **quote cụ thể section**.

### Step 4 — SYNTHESIZE: Prioritized Recommendation

Trả lại danh sách đã sắp xếp theo mức độ critical:

1. **Truthfulness blockers** (zero baseline violation, axis truncation không annotate, dual-axis ngoài whitelist, aggregate hide Simpson) — fix **đầu tiên**.
2. **Encoding mismatches** (chart sai với data shape — pie >3, bubble cho precision, rainbow sequential) — fix **thứ hai**.
3. **Clarity** (data-ink, annotation, direct label thay legend, Insight field) — fix **thứ ba**.
4. **Accessibility** (WCAG 2.2 AA minimum + Chartability) — **bắt buộc** trước release.
5. **Performance + responsive** — polish cuối.

Mọi recommendation kèm **confidence label**: **HIGH** (cited + reviewed), **MEDIUM** (principle applied, chưa verify live), **LOW** (guess, cần empirical check).

### Step 5 — CHALLENGE: 3-Minute Story + Pre-Mortem + A11y Sweep

Trước khi finalize:

- **3-minute story test:** ai đó narrate được takeaway của dashboard này mà **không cần nhìn** nó không? Không → annotation/hierarchy còn broken.
- **Invert test:** đưa cho naive user xem 60s → hỏi *"Big Idea là gì?"*. Nếu trả lời lệch với Big Idea đã viết → redesign.
- **Pre-mortem:** imagine ngày mai exec đọc nhầm chart này và ra quyết định sai — vì sao? Fix path đó trước.
- **Anti-pattern sweep:** chạy 20-point checklist (§ *Anti-Pattern Checklist*).
- **A11y sweep:** axe-core + Chartability + CVD simulator + screen reader thật + `prefers-reduced-motion`.

---

## 10 Core Principles (Quick Reference)

Practical application rules: `references/design-guidelines.md` §3.1–3.13. Research lineage: `references/research-foundations.md`.

### 1. Audience-first, Big Idea per screen
Mỗi màn hình / widget phải đóng gói được trong **một câu** nêu viewpoint + so what + action. Không viết được câu đó → không ship. (Knaflic/Duarte Big Idea worksheet; Kosslyn "Relevance" principle.)

### 2. Martini Glass landing
Hero = author-driven insight + 1–3 annotation trực tiếp trên data point quan trọng. Phần reader-driven exploration (filter, small multiples, drill) đẩy xuống dưới hoặc tab con. Anti-pattern cần tránh: *"filter-first, insight-never"* (user phải click qua mấy bộ lọc mới thấy được insight). (Segel & Heer 2010.)

### 3. Encoding khớp thang đo (Cleveland–McGill ranking)
Quantitative → **position / length** (bar, line, dot, scatter). Ordinal → sequential single-hue luminance. Nominal → spatial region (facet) rồi hue ≤8. Part-to-whole → horizontal bar 100% hoặc donut + center label (≤3 slice). Matrix → heatmap. Hierarchy → treemap. **Never:** pie >3 slice, bubble cho precision, rainbow sequential, 3D bất kỳ, dual-axis (trừ 3 exception ở Principle 5), radar/spider, gauge/dial (dùng bullet graph).

### 4. KPI card có context, không bao giờ số trần
Anatomy bắt buộc: **label + tabular-nums value + delta với comparator phrase + trend glyph + sparkline + optional target tick**. Abbreviate display (`$12.3K`); tooltip và `aria-label` đưa số đầy đủ. Semantic color chỉ khi hướng "tốt" rõ ràng; **invert** cho churn / CPA / error rate / unsubscribe / time-to-resolution. Luôn kèm `↑↓` để không dependent vào color. (Few pitfall #2/#3; Rosling "size instinct"; Tufte sparkline; Shopify/Stripe/Vercel convergence.)

### 5. Truthfulness trước đã
**Bar/column/area**: không bao giờ truncate y-axis. **Line**: truncate chỉ khi annotate rõ ràng (Correll, Bertini & Franconeri CHI 2020 chứng minh truncation phóng đại perceived effect size *ngay cả khi viewer biết*). Mọi widget disclose `source + timeframe + last-refresh + n`. Forecast/low-sample → confidence band. Mọi aggregate phải có "break down by" để phát hiện Simpson's Paradox. **Dual-axis exception** (whitelist, có annotation): (a) same-measure-different-unit (°C/°F), (b) finance convention (price + volume), (c) connected-audience với known correlation.

### 6. Data-ink discipline + semantic color system
Maximize data-ink ratio → 1.0 (Tufte). Erase gridline đậm, redundant label, background tô, legend khi có thể direct-label. Reserve color cho **signal** — một accent per screen; grey hóa phần còn lại. Lock design token: `color.chart.{brand, neutral, success, warning, danger, info, categorical.1..8, sequential.blue, diverging.rdbu}`. **Default palette:** Okabe-Ito (categorical, Wong 2011), Viridis/Cividis (sequential), RdBu/BrBG (diverging).

### 7. Shneiderman mantra là baseline, không phải feature
Triển khai **đầy đủ**: Overview → Zoom & Filter → Details on Demand → **History** → **Extract**. History = URL-shareable filter state + bookmarkable view + undo. Extract = CSV/PNG/PDF của current view có **metadata row** (filter applied, range, generated-at UTC). `Cmd+K` command bar cho power user (Linear/Stripe/Superhuman pattern). (Shneiderman 1996 — SaaS analytics vẫn underdeliver History và Extract tới 2026.)

### 8. Hierarchy qua typography + spacing, không qua màu
Type scale với tabular-nums (Inter / IBM Plex / Söhne / SF Pro): KPI value 32–40px/600, label 14px/500 muted, tick 12px/400 (never <11px). 8pt grid, card padding 16–24px, section gap 32–48px. Critical KPI **top-left** (NN/g 69% attention). Above-the-fold @ 1366×768 phải chứa: title + global filter + ≥3 KPI + ≥1 hero chart. Title widget = **sentence case + active verb + ≤12 words + mô tả insight** không chỉ data (sai: *"Sales by region"* — đúng: *"Enterprise sales overtook SMB in Q2"*).

### 9. Accessibility là first-class, không retrofit
Tuân thủ WCAG 2.2 AA + Chartability (Elavsky 2022) cho mọi chart và interaction. **Contrast:** text 4.5:1, graphical mark 3:1 vs background + adjacent mark, focus ring 3:1. **Target size:** ≥24×24 CSS px (WCAG 2.5.8 AA); 44×44 cho mobile. **Redundant encoding:** color + shape/line-style/label (không chỉ color). **Screen reader:** `role="img"` + short `aria-label` + long `aria-describedby` + `<table>` alternative ẩn hoặc toggle. **Keyboard:** Tab focus chart wrapper, arrow keys traverse point, Enter drill, Esc thoát. **Dark mode chart:** background `#161616` (Carbon) **không pure black**; desaturate 15–25%; sequential palette invert. Respect `prefers-reduced-motion`. (8% nam màu mù — Wong 2011.)

### 10. Performance là UX (RAIL + skeleton + progressive)
Filter/hover <100ms ack; animation 60fps; TTI dashboard <1s mid-range; first KPI <500ms. Per-tile SSR + Suspense — **không global spinner**. Skeleton shape match thật (bar stub, axis stub). Server aggregate time-series đến bin ≈ viewport pixel width. LTTB downsampling khi >2k point (Steinarsson 2013). WebGL khi >10k point; SVG ≤1k (ưu tiên a11y). Optimistic UI cho filter change; Web Worker cho parse/aggregate heavy. (RAIL/Google 2015; Nielsen/Miller thresholds; Mejtoft 2018 skeleton > spinner.)

---

## Chart Selection Matrix

| Data shape | Choose | Fallback | **Forbidden** |
|---|---|---|---|
| 1 metric hiện tại | KPI card + sparkline | Bullet graph (có target) | Gauge / dial / speedometer |
| 1 metric over time, >7 điểm | Line | Area (khi stack) | 3D, stepped trend |
| 1 metric over time, ≤7 điểm | Column | Line | Pie |
| So sánh metric qua 3–15 category | Horizontal bar (sorted) | Dot plot | Pie, 3D bar |
| So sánh 2–4 metric qua category | Grouped bar hoặc small multiples | Slope chart (2 period) | Dual-axis, radar |
| Part-to-whole, 2–3 phần | Donut với center label | Stacked bar 100% | Pie nhiều slice |
| Part-to-whole, 4+ phần | Stacked bar 100% hoặc treemap | Waterfall (change) | Pie, sunburst nhiều tầng |
| Phân phối | Histogram | Violin, strip | Boxplot khi bimodal |
| Tương quan 2 numeric | Scatter | Hex-bin (dense) | Dual-axis line |
| Matrix 2 categorical | Heatmap | Dot matrix | 3D surface |
| Pattern theo calendar | Calendar heatmap | Horizon chart | Line (che DOW) |
| Retention cohort | Triangle heatmap | Line per cohort | Stacked bar |
| Funnel drop-off | Funnel bar hoặc sorted % bar | Sankey (nhiều path) | 3D stylized funnel |
| Forecast + uncertainty | Line + confidence band | Fan chart | Single line không band |
| Lookup exact value | Table (có inline bar) | Heat-tabled table | Chart alone |

**Table > chart khi:** user cần lookup giá trị cụ thể, so sánh individual value (không phải series), multiple unit of measure, hoặc ≤6 row. (Few, *Show Me the Numbers*, Ch. 2.)

---

## Routing Table — Input → Starting Point

| User nói… | Start với |
|---|---|
| *"Review dashboard của tôi"* | Principles 1, 5, 8 + Anti-pattern checklist + 3-minute story test |
| *"Vì sao chart này khó đọc?"* | Principle 3 (encoding mismatch) + Cleveland–McGill ranking |
| *"Chọn chart cho data X"* | Chart Selection Matrix + Few's Table-vs-Chart rule |
| *"Dùng màu nào?"* | Principle 6 + `design-guidelines.md` §3.5 color tokens + Okabe-Ito / Viridis defaults |
| *"A11y của dashboard?"* | Principle 9 + `design-guidelines.md` §3.9 checklist + Chartability |
| *"Design KPI card"* | Principle 4 + `design-guidelines.md` §3.3 anatomy |
| *"Sếp muốn gauge / pie 3D"* | Anti-pattern #3/#5 + Few bullet graph alternative + push back |
| *"Filter quá nhiều"* | Principle 7 + Hick's Law grouping + default-collapse + search |
| *"Homepage flow thế nào?"* | Principle 2 (Martini Glass) + `design-guidelines.md` §3.2 layout |
| *"Dashboard load chậm"* | Principle 10 + `design-guidelines.md` §3.10 perf budget |
| *"Dark mode chart vỡ"* | `design-guidelines.md` §3.5.3 + Carbon `#161616` + invert sequential |
| *"Dual-axis OK không?"* | Principle 5 — **chỉ** khi same-measure-different-unit / finance convention / connected correlation; annotate rõ |
| *"Mobile dashboard?"* | `design-guidelines.md` §3.11 + reflow rules + 44×44 tap targets |
| *"Truncate trục được không?"* | Principle 5 — **cấm** cho bar/column/area; line OK nếu annotate (Correll 2020) |
| *"Khi nào table > chart?"* | Few rule: exact lookup, individual compare, multi-unit, ≤6 row |

---

## Anti-Pattern Checklist (20 Review Blockers)

Reject PR / block release nếu bất kỳ điểm nào xuất hiện:

1. Bar / column / area với y-axis không start từ 0
2. Dual-axis ngoài 3 exception đã whitelist (§Principle 5)
3. Bất kỳ 3D (pie, bar, area, surface)
4. Pie >3 slice hoặc donut >5 slice
5. Gauge / dial / speedometer
6. ≥8 color categorical trong một chart
7. Rainbow colormap cho sequential data
8. Red/green một mình không có glyph + label
9. KPI card không có comparator phrase
10. Tooltip chỉ repeat label đã hiện trên chart
11. Chart không có accessible alternative (table hoặc long desc)
12. Hover-only interaction không keyboard equivalent
13. Font <11px cho tick label
14. Title generic (*"Sales by region"*) trên explanatory surface
15. Filter state không URL-shareable
16. Export CSV không có metadata row (filters, range, generated-at UTC)
17. Hero chart trên explanatory surface không có Insight field / annotation
18. Percentage không có denominator (`n=`)
19. Aggregate không có "break down by" (Simpson's Paradox risk)
20. Global spinner thay cho per-tile skeleton

---

## When in Doubt

- Đẹp vs đúng → **đúng**
- Đầy đủ vs sáng rõ → **sáng rõ**
- Linh hoạt vs nhất quán → **nhất quán**

Dashboard là sản phẩm **dùng hàng ngày**, không phải demo reel.

---

## References

| File | Scope |
|---|---|
| [`references/research-foundations.md`](./references/research-foundations.md) | Literature review — cognitive science (Bertin, Cleveland–McGill, Munzner), Tufte discipline, Few taxonomy + 13 pitfalls, Shneiderman mantra, Gestalt, Storytelling (Knaflic/Cairo/Segel–Heer), NN/g UX research, Cognitive Load Theory, WCAG + Chartability + color vision, design systems (Carbon, Polaris, Atlassian, Material, Fluent), SaaS dashboard practice (Stripe/Linear/Vercel/Datadog/Shopify/Plausible/GitHub) |
| [`references/design-guidelines.md`](./references/design-guidelines.md) | Practical guidelines — surface taxonomy, layout/grid, KPI anatomy, chart matrix, color tokens, typography, interaction patterns, annotation/storytelling layer, a11y checklist, performance budget, mobile reflow, 20-point anti-pattern list, 3-minute story review ritual |
| [`references/sources.md`](./references/sources.md) | Full bibliography — canonical books, academic papers, design systems, real-world case studies |

**Luôn đọc file reference khi user cần depth vượt quá summary phía trên.** Không quote từ memory — cite chính xác `file:§section`.
