---
name: aio-visual-diff
description: |
  Verify AI-generated frontend UI against design via measurement-driven diff — extracts `getComputedStyle` + `getBoundingClientRect` through chrome-devtools MCP, diffs against Figma data or baseline JSON, reports numerical deltas. Use when checking pixel-perfect implementation, validating design fidelity, catching layout regressions, or when the agent claims "it looks right" but you want numerical proof instead of eyeballed screenshots.
when_to_use: visual diff, pixel diff, pixel perfect, design fidelity, frontend verify, UI regression, measurement loop, computed CSS, layout diff, Figma compare, design check, padding wrong, font size off, spacing off, AI built UI verify, baseline regression, visual QA, Radix token trap, Tailwind token check, MUI spacing wrong, shadcn line-height
argument-hint: "<dev-url> <selector> [--figma <node-url>]"
effort: medium
---

# Visual Diff — Measurement Driven, Not Eyeballed

> *"Heading font size is 28px, spec says 24px, change Heading size from 7 to 6."*
> Specific, numerical, unambiguous. **That** is feedback the agent can act on.

LLM (kể cả multimodal) yếu spatial pixel reasoning — đưa nó 2 screenshot rồi hỏi *"giống không?"* sẽ trả lời chủ quan và thường sai. Skill này thay bằng vòng lặp **đo số → diff số → fix theo delta**.

---

## Required Setup

- **`chrome-devtools` MCP** (bắt buộc) — extract measurements từ DOM thật. Tools dùng: `navigate_page`, `evaluate_script`.
- **`figma` MCP** (optional) — Figma fidelity mode. Tool dùng: `get_design_context`. Không có → tự động fall sang baseline regression mode.

Cả hai đều phải có dev server đang chạy ở URL truyền vào.

---

## Two Modes

| Mode | Khi dùng | Reference source |
|---|---|---|
| **Figma fidelity** | Có Figma file làm spec | `figma__get_design_context` → node layout numeric |
| **Baseline regression** | Không có Figma, chỉ chống drift | `.aio-visual-diff/<selector-hash>.json` lần đo đầu tiên |

---

## Workflow

### Step 1 — Identify target

Hỏi user *chỉ* những gì còn thiếu:

- Dev URL (vd `http://localhost:3000`)
- Selector của component cần verify (xem **Selector Strategy** bên dưới)
- Figma node URL (optional) — không có → chạy baseline mode

### Step 2 — Render & extract numbers

```
chrome-devtools__navigate_page → <dev-url>
chrome-devtools__evaluate_script → measurement function (paste-as-string)
```

**Measurement function template** — replace `SELECTOR_HERE`, paste nguyên cả block làm `function` arg cho `evaluate_script`:

```js
(() => {
  const el = document.querySelector('SELECTOR_HERE');
  if (!el) return { error: 'selector not found' };
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  return {
    box: { x: r.x, y: r.y, w: r.width, h: r.height },
    typography: {
      fontSize: cs.fontSize,
      lineHeight: cs.lineHeight,
      fontWeight: cs.fontWeight,
      letterSpacing: cs.letterSpacing,
      fontFamily: cs.fontFamily,
    },
    spacing: {
      padding: cs.padding,
      margin: cs.margin,
      gap: cs.gap,
    },
    color: {
      color: cs.color,
      background: cs.backgroundColor,
      borderColor: cs.borderColor,
    },
    layout: {
      display: cs.display,
      flexDirection: cs.flexDirection,
      justifyContent: cs.justifyContent,
      alignItems: cs.alignItems,
    },
    border: {
      width: cs.borderWidth,
      radius: cs.borderRadius,
      style: cs.borderStyle,
    },
    counts: {
      svgs: el.querySelectorAll('svg').length,
      imgs: el.querySelectorAll('img').length,
      children: el.children.length,
    },
  };
})()
```

Trả về JSON measurements. **Không** lưu screenshot — chỉ numbers.

### Step 3 — Get reference values

**Figma mode** — `figma__get_design_context` với node URL → extract layout numeric (width, height, padding, fontSize, fill colors). Nếu MCP rate-limit hay trả empty → log warning, fallback baseline mode (đừng silent fail).

**Baseline mode** —
- Hash `selector + dev-url` → tên file `.aio-visual-diff/<hash>.json`.
- File chưa tồn tại → ghi current measurements làm baseline → exit với message *"baseline frozen, re-run after change to diff"*.
- File tồn tại → load → diff.

### Step 4 — Compute & display delta

Output **markdown table numerical**, **không** narrative:

```
| Property            | Current        | Target         | Δ              |
|---------------------|----------------|----------------|----------------|
| typography.fontSize | 28px           | 24px           | +4px           |
| typography.lineHeight | 36px         | 32px           | +4px           |
| spacing.padding     | 16px 24px      | 12px 20px      | +4 / +4        |
| color.background    | rgb(15,23,42)  | rgb(2,6,23)    | mismatch       |
| box.w               | 384            | 360            | +24            |
| counts.svgs         | 2              | 1              | +1 (extra icon)|
```

**Normalize trước khi diff**:
- Color: parse về hex hoặc RGB tuple — `rgb(15,23,42)` và `#0f172a` là same, khác representation.
- Spacing: shorthand `16px 24px` → `[16, 24, 16, 24]` array.
- Numeric strings (`"24px"`) → number.

### Step 5 — Feed delta to fix loop

Format **mọi** correction theo template Vadim:

> `[element].[property]` is `[measured]`, spec says `[target]` → change `[concrete code/token]`

Examples:
- `heading.fontSize is 28px, spec says 24px → change <Heading size="7"> to <Heading size="6">`
- `card.padding is "16px 24px", spec says "12px 20px" → change p-4 px-6 to p-3 px-5`
- `searchBar svg count is 2, spec is 1 → remove duplicate icon at src/components/SearchBar.tsx:42`

**Specify language explicit** trong correction prompt — AI mặc định viết Python cho Playwright dù project TypeScript.

### Step 6 — Loop

Re-run Step 2 → re-diff Step 4 → re-feed Step 5. Stop khi đáp ứng **Stop Conditions** bên dưới.

---

## Selector Strategy

Theo thứ tự ưu tiên:

1. **`data-*` attributes** — `[data-testid="hero"]`, `[data-card="pricing"]`. Stable nhất, design intent rõ. Recommend user thêm `data-testid` cho component cần diff lâu dài.
2. **Semantic tag + role** — `header h1`, `[role="dialog"]`, `main > article:first-child`. OK khi unique.
3. **Class** — chỉ khi class là design-token-stable (`.btn-primary`). Tránh utility (`.flex`, `.p-4`) — quá generic, match nhiều element.
4. **NEVER** — auto-generated class (`.css-1q2w3e`, `.styles__Button-sc-x`). Vỡ mỗi build.

**Counting trick**: khi element con không có name (icon, divider), đếm `.querySelectorAll('svg').length` thay vì identify từng cái. Vadim phát hiện duplicate icon kiểu này khi AI hallucinate thêm `<SearchIcon />` thứ 2.

---

## Token Traps (đọc kỹ — đây là ROI thật của skill)

AI guess sai design token vì training data outdated, vì cascade resolution, vì theme override. **Chỉ runtime measurement mới catch được:**

| Library | Token AI hay guess | Reality |
|---|---|---|
| **Radix Themes** | `space="6"` = 24px | **40px** |
| **Radix Themes** | `<Heading size="7">` = 24px | **28px** |
| **Material UI** | `theme.spacing(6)` = 24px | **48px** (default 8px unit × 6) |
| **Tailwind** | `text-xl` line-height | `1.25` × 20 = **25px**, không phải 24px như AI hay nghĩ |
| **shadcn** | `text-2xl` = 24px | đúng — nhưng `tracking-tight` modify `letterSpacing -0.025em`, AI thường quên |
| **Chakra** | `Box p={6}` = 24px | đúng (1 unit = 4px), nhưng `<Container>` wrap có thể double padding |

**Pattern phòng tránh**: sau mỗi lần AI thay class/prop, **re-measure ngay**, không trust class name → giá trị runtime.

---

## Anti-Patterns (cấm trong loop)

- ❌ **Eyeball screenshots**: không bao giờ `chrome-devtools__take_screenshot` rồi paste vào multimodal LLM hỏi *"giống design không?"*. LLM yếu spatial pixel reasoning.
- ❌ **Trust class names**: `.text-2xl` không guarantee fontSize 24px ở runtime — cascade, theme provider, container query, media query có thể override.
- ❌ **Ignore counts**: 1 SVG dư, 1 child element thừa = bug visual nhưng box dimensions vẫn match.
- ❌ **Loop mãi**: 5 vòng không converge → root cause khác (component sai, framework override, CSS specificity war). Stop, escalate.
- ❌ **Diff color string trực tiếp**: `rgb(15,23,42)` vs `#0f172a` — same color, khác representation. Normalize trước khi compare.
- ❌ **Skip baseline khi không có Figma**: vẫn nên freeze baseline để chống regression — pixel-stable hôm nay là tài sản.

---

## Stop Conditions

| Status | Condition |
|---|---|
| ✅ **Pass** | Mọi delta trong threshold: font ±0.5px, line-height ±0.5px, box ±1px, color exact sau normalize, counts exact |
| ⚠️ **Escalate** | 5 iter loop không converge → root cause khác, đừng brute-force |
| ⚠️ **Setup error** | Selector không match → check dev server còn chạy, route còn tồn tại, selector còn valid |
| ⚠️ **Figma rate-limit** | MCP 429 hoặc empty response → log warning, fallback baseline mode |
| ⚠️ **Color mismatch sau normalize** | Khả năng cao là theme/dark-mode khác → confirm với user trước khi sửa |

---

## Quick Example

**User**: *"Verify hero card ở http://localhost:3000, selector `[data-testid="hero"]`, Figma node là https://figma.com/file/X/?node-id=12-34"*

**Flow**:
1. `chrome-devtools__navigate_page` → `http://localhost:3000`
2. `chrome-devtools__evaluate_script` với function template, `SELECTOR_HERE` → `[data-testid="hero"]` → JSON measurements
3. `figma__get_design_context` cho node `12-34` → JSON spec
4. Normalize colors + spacing → diff → table:
   ```
   | Property            | Current     | Target      | Δ     |
   | typography.fontSize | 18px        | 20px        | -2px  |
   | spacing.padding     | 16px 24px   | 24px 32px   | -8/-8 |
   | counts.svgs         | 2           | 1           | +1    |
   ```
5. AI đọc table → fix theo template *"hero.padding is 16px 24px, spec 24px 32px → change p-4 px-6 to p-6 px-8 in src/components/Hero.tsx"*
6. Re-measure → all deltas ≤ threshold → ✅ pass.

---

## When in Doubt

- **Trust the number, not the screenshot.**
- **Re-measure after every code change** — class name không phải runtime value.
- **5 iter chưa converge** = signal *root cause khác*, không phải *cố thêm vòng nữa*.
