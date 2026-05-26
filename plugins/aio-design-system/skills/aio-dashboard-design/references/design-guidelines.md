# Design Guidelines — Dashboard (Practical, Actionable)

Guideline này dùng cho cả design reference và code/design review. Mỗi rule có ví dụ cụ thể, áp dụng được ngay cho SaaS analytics dashboard (hệ sinh thái Shopify và tương tự).

Research lineage: xem `research-foundations.md`. 10 core principles: xem `SKILL.md`.

---

## 3.1 Surface taxonomy — quyết định TRƯỚC khi code

### Rule 3.1.1 — Exactly one of three types

Phân loại mỗi surface thành exactly một trong ba: **Operational / Analytical / Strategic**. Không cho phép surface *mixed* trừ khi dùng Martini Glass structure rõ ràng.

- **Strategic** (Home, Overview, Morning Briefing, Email digest): ≤5 KPI card + 1 hero chart + 0–2 highlight table. Refresh ngày.
- **Analytical** (Reports, Funnels, Cohorts, Explorer): filter panel + small multiples + cross-filter + saved view.
- **Operational** (Live orders, Fulfillment queue, Error monitor): real-time counter + threshold bullet + alert strip trên top.

### Rule 3.1.2 — In-context analytics trước dedicated tab

Nếu merchant cần biết *"sales của product này tuần qua"*, hiển thị ngay trên product page (Shopify Admin pattern), **không bắt navigate sang Analytics**. Dedicated tab chỉ để aggregate / cross-cut / deep dive.

---

## 3.2 Layout & Grid

### Rule 3.2.1 — 12-column grid, 8pt unit

Grid 12 cột, 8pt spacing unit. Breakpoint:
- 1 col <600px
- 2 cols 600–900px
- 3 cols 900–1280px
- 4 cols ≥1280px

### Rule 3.2.2 — Minimum widget widths

- **KPI card**: ≥3 cols (desktop) / full width (mobile).
- **Timeseries chart**: ≥4 cols (Datadog rule — <4 cols sẽ squashed).
- **Table**: full width.

### Rule 3.2.3 — Spatial priority

- Critical KPI **top-left** (69% attention — NN/g 2010).
- Trend chart **middle**.
- Breakdown table **bottom**.
- Filter / date picker **top-right** (global, sticky, persist qua URL).

### Rule 3.2.4 — Above-the-fold baseline

Above-the-fold ở 1366×768 phải chứa: dashboard title + global filter + ≥3 KPI card + ≥1 hero chart (hoặc partial).

---

## 3.3 KPI Card Component

### Rule 3.3.1 — Anatomy bắt buộc

```
┌──────────────────────────────────────────┐
│ [Label 14px muted]              [ⓘ] [⋯] │
│ [Value 32–40px tabular-nums bold]        │
│ [↑ Δ%] [vs comparator phrase muted 12px] │
│ [Sparkline 18px tall, 30–60 points]      │
│ [Optional: Target $X  ·······•          ]│
└──────────────────────────────────────────┘
```

### Rule 3.3.2 — Value formatting

- **Display**: abbreviate (`$12.3K`, `1.24M`, `18.7%`, `0:04:23`)
- **Hover/tooltip**: số đầy đủ có thousand separator
- **`aria-label`**: đọc dạng full (*"twelve thousand three hundred dollars"*)

### Rule 3.3.3 — Delta luôn kèm comparator phrase

- Sai: `+12.3%`
- Đúng: `↑ 12.3% vs last 30 days`

Nếu không có comparison period → **không hiển thị delta** (thay vì để số mồ côi).

### Rule 3.3.4 — Semantic color

Chỉ áp dụng khi hướng "tốt" rõ ràng. **Invert cho**:
- Churn
- Cost-per-acquisition (CPA)
- Error rate
- Unsubscribe rate
- Time-to-resolution

Khi mơ hồ (session duration, đơn hàng trung bình tùy chiến lược) → dùng **neutral blue/orange** (Okabe-Ito).

### Rule 3.3.5 — Card click → swap hero chart Y-axis

Plausible pattern. Hỗ trợ keyboard: Tab focus, Enter để swap. Giảm cognitive load vì user không phải điều hướng riêng.

---

## 3.4 Chart Selection Matrix (Cheat Sheet)

| Data shape | Chọn | Fallback | Cấm |
|---|---|---|---|
| 1 metric, hiện tại | KPI card + sparkline | Bullet (có target) | Gauge, speedometer |
| 1 metric over time, >7 điểm | Line | Area (khi stack) | Bar, stepped 3D |
| 1 metric over time, ≤7 điểm | Column | Line | Pie |
| So sánh metric qua 3–15 category | Horizontal bar (sorted) | Dot plot | Pie, 3D bar |
| So sánh 2–4 metric qua category | Grouped bar hoặc small multiples | Slope chart (2 period) | Dual-axis, radar |
| Part-to-whole, 2–3 phần | Donut với center label | Stacked bar 100% | Pie nhiều slice |
| Part-to-whole, 4+ phần | Stacked bar 100% hoặc treemap | Waterfall (change) | Pie, sunburst nhiều tầng |
| Phân phối | Histogram | Violin, strip | Boxplot khi bimodal |
| Tương quan 2 numeric | Scatter | Hex-bin (dense) | Dual-axis line |
| Matrix 2 categorical | Heatmap | Dot matrix | 3D surface |
| Pattern theo calendar | Calendar heatmap | Horizon | Line (che DOW) |
| Retention cohort | Triangle heatmap | Line per cohort | Stacked bar |
| Funnel drop-off | Funnel bar hoặc bar %, sorted | Sankey (nhiều path) | Funnel 3D stylized |
| Forecast + uncertainty | Line + confidence band | Fan chart | Single line |
| Lookup exact value | Table (có inline bar) | Heat-tabled table | Chart alone |

### Rule 3.4.1 — Table khi nào > chart

(a) User cần lookup giá trị cụ thể, (b) so sánh individual value không phải series, (c) multiple unit of measure, (d) dữ liệu có ≤6 row. (Few, *Show Me the Numbers*, Ch. 2.)

### Rule 3.4.2 — Cấm trong design system

- 3D bất kỳ (pie, bar, area, surface)
- Gauge / dial / speedometer
- Radar / spider (trừ use case rất hẹp cho profile comparison)
- Rainbow colormap
- Pie >3 slice
- **Dual-axis** (trừ 3 exception ở §3.5.6)

---

## 3.5 Color Tokens (Mandatory Lock trong Design System)

### Rule 3.5.1 — 4 role chart color token

```
color.chart.brand              ← default single series
color.chart.neutral            ← de-emphasized / past period
color.chart.categorical.1..8   ← Okabe-Ito sequence, apply theo thứ tự
color.chart.sequential.blue    ← Viridis / single-hue ramp 10 step
color.chart.diverging.rdbu     ← RdBu 11 step (ColorBrewer)
color.chart.success/.warning/.danger/.info ← alert palette semantic
```

### Rule 3.5.2 — Max 6 categorical color / chart

Vượt quá → group thành *"Other"* hoặc chuyển sang ranked bar + filter.

### Rule 3.5.3 — Dark mode

- Background `#161616` (Carbon) — **không** pure black
- Desaturate 15–25%
- Sequential palette **invert** (light = large value)
- Verify 3:1 từng mark so background
- Token phải có variant light/dark

### Rule 3.5.4 — Adjacent mark cùng hue

Không đạt 3:1 → chèn 1–2px `color.border.inverse` giữa (Atlassian rule).

### Rule 3.5.5 — Red/green good/bad — luôn kèm glyph

Phải kèm `↑↓` hoặc `✓✗` và text label. Trên dashboard phục vụ Đông Á (merchant Shopify Trung Quốc/Đài Loan), cân nhắc đảo convention (đỏ = tốt / xanh = tệ ở một số thị trường) hoặc dùng blue/orange neutral.

### Rule 3.5.6 — Dual-axis: 3 exception duy nhất

Dual-axis (hai trục Y khác scale trên cùng chart) bị cấm mặc định. Chỉ cho phép trong 3 trường hợp sau, **và phải annotate rõ ràng** 2 trục thuộc về metric khác nhau:

1. **Same-measure-different-unit** — °C/°F, miles/km (cùng đại lượng, hai đơn vị).
2. **Finance convention** — price + volume trên cùng axis (convention lâu đời của trader, audience quen).
3. **Connected-audience with known correlation** — khi audience đã biết 2 metric tương quan (vd: DAU + Revenue cho team growth đã brief trước).

Outside 3 case trên → **chuyển sang small multiples hoặc grouped bar**. Dual-axis dễ khiến reader đọc sai tương quan vì bố trí 2 scale tự ý.

---

## 3.6 Typography

### Rule 3.6.1 — Font stack hỗ trợ tabular + lining nums

Inter (recommended), IBM Plex Sans, Söhne, SF Pro. CSS bắt buộc cho mọi số liệu:

```css
.numeric,
table td[data-type="number"],
.kpi-value {
  font-variant-numeric: tabular-nums lining-nums;
  font-feature-settings: "tnum", "lnum";
}
```

### Rule 3.6.2 — Type scale tối thiểu

| Element | Size / Weight |
|---|---|
| Page title | 24–28px / 600 |
| Section header | 18–20px / 600 |
| KPI value | 32–40px / 600 tabular |
| Card label | 14px / 500 muted |
| Body / table | 14px / 400 |
| Tick label | 12px / 400 (never <11px) |

### Rule 3.6.3 — Title widget

Dùng **sentence case**, **active verb**, ≤12 words, mô tả insight không chỉ data.

- Sai: *"Sales by region"*
- Đúng: *"Enterprise sales overtook SMB in Q2"*

### Rule 3.6.4 — Number formatting

- Dùng `Intl.NumberFormat` locale-aware
- Minus sign **U+2212** không phải hyphen `-`
- Currency symbol **adjacent value** không phải label

---

## 3.7 Interaction Patterns

### Rule 3.7.1 — Tooltip

- Delay ~300ms, follow cursor
- Hiển thị precise value + comparator + *"click to explore"* hint
- **Không repeat label** đã hiện trên chart (Tufte rule)

### Rule 3.7.2 — Time range picker

- Global + sticky + persistent URL
- Preset: Today, 7d, 28d, 30d, 90d, QTD, YTD, Custom
- Luôn có *"Compare to"* toggle (previous period / same period last year)

### Rule 3.7.3 — Filter

- Chip trong single row, click to edit in place (Linear pattern)
- Tự động save thành *"view"* sau khi user dùng cùng filter combination 3 lần
- Filter collapse mặc định khi >10 options; drive bằng search khi >30

### Rule 3.7.4 — Drill-down

- Click bar/point → slide-over right drawer (Linear/Mixpanel) hoặc breadcrumbed page (Stripe)
- **Giữ filter state** khi navigate

### Rule 3.7.5 — Cross-filter

- Cho phép trong **Analytical** surface
- Cấm default trong **Strategic** (gây confusion)
- Luôn có *"Reset all filters"* button visible

### Rule 3.7.6 — Command bar `Cmd+K`

- Navigate, jump to metric, apply saved view, export
- Hover 2s trên element bất kỳ reveal shortcut hint (Linear pattern)

### Rule 3.7.7 — Export

- **CSV**: header đủ + metadata row (filter applied, range, generated-at UTC)
- **PNG**: 2x-density
- **PDF**: cho reporting với branding + timestamp

---

## 3.8 Annotation & Storytelling Layer

### Rule 3.8.1 — Insight field

Mỗi hero chart trong explanatory surface phải có **Insight field** — một câu headline do analyst / rule engine / LLM summarizer tạo, hiển thị phía trên chart.

> Ví dụ: *"Churn rate spiked in week of Apr 8, driven by Basic plan cancels (64% of total)."*

### Rule 3.8.2 — Direct annotation

1–3 annotation trực tiếp trên điểm dữ liệu quan trọng (arrow + label).

- Ví dụ: *"Feature X launched"* (vertical line)
- Ví dụ: *"COVID period"* (shaded band)

### Rule 3.8.3 — Pre-empt misinterpretation

- *"Axis does not start at zero"* khi line truncate
- *"n=37, small sample"* khi cần
- *"Data revised on Apr 1"* khi recent change

### Rule 3.8.4 — Disclosure footer

Trên mọi widget: `Updated Xm ago · n=Y · source · timezone`. Click reveal full data dictionary của metric.

---

## 3.9 Accessibility Checklist (Blocker cho Release)

### Rule 3.9.1 — Contrast

- Text ≥4.5:1
- Large text ≥3:1
- Graphical mark ≥3:1 vs background + adjacent mark
- Focus ring ≥3:1

### Rule 3.9.2 — Target size

- ≥24×24 CSS px (WCAG 2.5.8 AA)
- 44×44 cho mobile/touch

### Rule 3.9.3 — Redundant encoding

Mọi chart dùng **≥2 channel**: color + shape, hoặc color + line-style, hoặc color + label. Single channel (color only) → fail.

### Rule 3.9.4 — Screen reader

Chart có:
- `role="img"`
- `aria-labelledby` (title ngắn)
- `aria-describedby` (long description ≤2 câu: shape + trend + takeaway)
- Toggle `<table>` alternative ẩn hoặc visible

### Rule 3.9.5 — Keyboard navigation

- **Tab** → focus chart wrapper
- **Arrow keys** → traverse data point
- **Enter** → drill
- **Esc** → thoát
- Focus visible ring ≥2px

### Rule 3.9.6 — Motion

Respect `prefers-reduced-motion`:
- Skeleton static
- Transition ≤150ms hoặc off

### Rule 3.9.7 — CI check

axe-core + Chartability heuristics trên mỗi PR mới thêm chart component.

---

## 3.10 Performance Budget

### Rule 3.10.1 — RAIL targets

- **Response** filter/hover: <100ms (user input ack)
- **Animation**: 60fps cho transition chart (16ms/frame)
- **Load**: TTI dashboard <1s trên mid-range, first KPI <500ms

### Rule 3.10.2 — Skeleton match shape

- Shape match actual component (bar stub, axis stub)
- Stream per-tile SSR + Suspense
- **Không block cả page** vì một slow query

### Rule 3.10.3 — Server aggregate đến pixel density

Chart 800px wide, range 2 năm → bin = day hoặc week, không gửi raw second.

### Rule 3.10.4 — Downsampling

- **LTTB** khi >2k point gốc (Steinarsson 2013)
- **WebGL** (deck.gl / regl) khi >10k point
- **SVG** cho ≤1k point (ưu tiên a11y + styling)

### Rule 3.10.5 — Optimistic UI cho filter change

- Render ngay bằng cached/predicted data
- Reconcile sau response
- Hiển thị subtle *"updating"* indicator

### Rule 3.10.6 — Offload heavy work

Web Worker cho parse/aggregate heavy.

---

## 3.11 Mobile & Responsive

### Rule 3.11.1 — Reflow

- 1 col <600px
- 2 cols 600–900px
- 3+ ≥1280px

Dùng **container queries** (CSS, 2023+) cho widget adapt theo slot, không chỉ viewport.

### Rule 3.11.2 — Mobile = monitoring use case

Above-the-fold: 3–5 hero KPI + 1 primary chart. Đẩy secondary vào tab/drawer.

### Rule 3.11.3 — Table → card stack trên <600px

Mỗi row thành vertical card label-by-label. Horizontal scroll **chỉ trong bounded card container**, không bao giờ page-level.

### Rule 3.11.4 — Touch interaction

- Tap reveal tooltip
- Long-press contextual actions
- **Không** hover-only

### Rule 3.11.5 — Sticky bar

Time-range + filter bar top, collapsible.

---

## 3.12 Anti-Pattern Checklist (Review Blocker)

Reject PR nếu có bất kỳ điểm nào:

1. Bar / column / area chart với y-axis không start từ 0
2. Dual-axis chart không thuộc 3 exception đã whitelist
3. 3D bất kỳ (pie, bar, area, surface)
4. Pie >3 slice hoặc donut >5 slice
5. Gauge / dial / speedometer
6. ≥8 color categorical trong một chart
7. Rainbow colormap cho sequential data
8. Red/green một mình không glyph + label
9. KPI card không có comparator phrase
10. Tooltip chỉ repeat label đã visible
11. Chart không có accessible alternative (table hoặc long desc)
12. Hover-only interaction không keyboard equivalent
13. Font <11px cho tick label
14. Title generic (*"Sales by region"*) cho explanatory surface
15. Filter state không URL-shareable
16. Export CSV không có metadata row
17. Hero chart không có Insight field / annotation
18. Percentage không có denominator (`n=`)
19. Aggregate không có "break down by" để phát hiện Simpson
20. Spinner chung cho cả dashboard (thay vì skeleton per-tile)

---

## 3.13 Review Ritual — 3-Minute Story Test

Trước release, PM / analyst phải:

1. **Write Big Idea** — một câu cho từng surface, kèm PR description.
2. **Narrate 3-minute story** không nhìn dashboard. Nếu không narrate được → redesign.
3. **Invert test** — đưa cho người chưa từng thấy, cho xem 60s, hỏi *"Big Idea là gì?"*. Nếu trả lời lệch với Big Idea đã viết → redesign layer annotation / hierarchy.
4. **Data truthfulness review** — 5 câu hỏi:
   - Truncated axis?
   - Dual-axis?
   - Denominator visible?
   - Aggregation có disaggregation path?
   - Uncertainty shown?
5. **Accessibility sweep** — axe + Chartability + screen reader thực + CVD simulator + keyboard-only navigation test.

Qua được hết 5 bước → sẵn sàng merge. Kẹt ở bước nào → **fix gốc**, không patch.

---

## Khi nghi ngờ

- Đẹp vs đúng → **đúng**
- Đầy đủ vs sáng rõ → **sáng rõ**
- Linh hoạt vs nhất quán → **nhất quán**

Dashboard là sản phẩm dùng hàng ngày, không phải demo reel.
