# Research Foundations — Dashboard Design

Literature review làm nền tảng cho 10 principle trong SKILL.md. Đọc khi user cần depth hoặc muốn evidence cụ thể cho recommendation.

---

## 1. Khoa học nhận thức về biểu đồ: từ Bertin đến Munzner

**Jacques Bertin** (*Sémiologie Graphique*, 1967) là người đầu tiên hệ thống hóa 7 "visual variables": **position, size, value (lightness), texture, color (hue), orientation, shape**. Quan trọng hơn, ông phân loại theo 4 cấp tổ chức (*selective, associative, ordered, quantitative*) và kết luận: **chỉ position và size hỗ trợ đọc định lượng trực tiếp**. Hue, shape, orientation chỉ phục vụ encode categorical/nominal. Value và texture có thứ tự nhưng không định lượng được.

**Cleveland & McGill** (*JASA*, 1984) kiểm chứng thực nghiệm và xếp hạng độ chính xác của các *elementary perceptual tasks*:

1. Position on common scale
2. Position on non-aligned scales
3. Length / direction / angle
4. Area
5. Volume / curvature
6. Color saturation / shading

Thí nghiệm cho thấy người đọc *systematically underestimate* tỉ lệ khi encode bằng area (power-law exponent ~0.7) — tức **bubble chart và treemap luôn bị đọc sai về độ lớn**. Heer & Bostock (CHI 2010) tái kiểm chứng ở quy mô crowdsource và xác nhận thứ hạng này.

**Tamara Munzner** (*Visualization Analysis and Design*, 2014) đưa ra hai nguyên tắc chi phối:

- **Expressiveness** — encoding phải biểu đạt *tất cả* và *chỉ* thông tin có trong dữ liệu: magnitude channel cho ordered, identity channel cho categorical.
- **Effectiveness** — attribute quan trọng nhất phải map vào channel cao nhất trong thứ hạng.

Rainbow colormap bị Munzner và **Borland & Taylor** (2007) bác bỏ vì 3 lý do: (1) không có thứ tự tri giác, (2) luminance không đều (tạo banding giả), (3) hỏng với màu mù.

**Implication:** Bar/line/scatter luôn thắng pie/bubble/heatmap cho việc đọc con số cụ thể. Map attribute quan trọng nhất vào position/length — nếu đặt nó vào color hoặc area, bạn đã rời bỏ độ chính xác 1–2 bậc.

---

## 2. Tufte và kỷ luật "ink-per-insight"

Edward Tufte định nghĩa **data-ink ratio** = `data-ink / total ink` = `1 − (ink có thể xóa không mất data-information)` (*The Visual Display of Quantitative Information*, 1983, p. 93). Mục tiêu: tiến gần 1.0. Năm quy tắc điều hành:

1. Above all else show the data
2. Maximize data-ink
3. Erase non-data-ink
4. Erase redundant data-ink
5. Revise and edit — all within reason

**Chartjunk** có 3 loại:
- **Moiré vibration** (lưới rung)
- **Grid** dày
- **Ducks** — trang trí nuốt chửng dữ liệu

**Lie Factor** = `size of effect shown / size of effect in data` — phải nằm trong `[0.95, 1.05]`. Ví dụ kinh điển: xe hơi NYT có `LF = 14.8` — gần 15 lần phóng đại.

**Sparkline** (*Beautiful Evidence*, 2006, p. 46–63): "word-sized graphics", data-ink ratio ~1.0, aspect ratio ~5:1, "bank to 45°" theo Cleveland.

**Small multiples** — *"graphical depictions sharing context, but not content"* — là lời giải cho câu hỏi gốc của tư duy định lượng: ***Compared to what?***

Tufte nghi ngờ metaphor "dashboard" từ xe hơi: người lái xe chỉ *liếc* bảng đồng hồ; còn giám đốc thì *sống* trong dashboard — do đó gauge/dial/stoplight là lãng phí pixel. Một con số kèm sparkline truyền tải nhiều hơn trong diện tích nhỏ hơn.

---

## 3. Stephen Few: taxonomy và 13 pitfalls

Few (*Information Dashboard Design*, 2006/2013) định nghĩa dashboard là *"a visual display of the most important information needed to achieve one or more objectives, consolidated and arranged on a single screen so the information can be monitored at a glance."*

Taxonomy 3 loại vẫn là tham chiếu chuẩn:

| Khía cạnh | **Strategic** | **Analytical** | **Operational** |
|---|---|---|---|
| Người dùng | Executive | Analyst | Front-line, NOC |
| Mục đích | KPI vs. goal, at-a-glance | Hiểu tại sao, explore | Monitor real-time, respond |
| Refresh | Ngày/tuần/tháng | Trên yêu cầu | Giây/phút |
| Interactivity | Thấp | Cao (drill, filter, pivot) | Trung bình + alerting |
| Density | Thấp-trung | Cao | Trung bình với salience mạnh cho alert |
| Element tiêu biểu | Bullet graph, sparkline, BAN | Scatter, heatmap, small multiples, brushing-linking | Bullet thresholded, tickers, status cue |

**13 pitfalls kinh điển của Few:**

1. Vượt một màn hình
2. Thiếu context cho số liệu
3. Độ chính xác thừa
4. Biểu đạt gián tiếp
5. Chọn sai phương tiện
6. Biến thể vô nghĩa
7. Phương tiện thiết kế tồi (3D, gauge)
8. Mã hóa định lượng sai (trục cắt)
9. Sắp xếp kém
10. Highlight không hiệu quả
11. Decoration vô dụng
12. Lạm dụng / sai màu
13. Tổng thể xấu

**Bullet graph** (phát minh của Few, 2006) là lời thay thế gauge/dial: `label + scale + bar giá trị + tick target + 1–3 dải background xám tăng dần` thể hiện qualitative bands.

---

## 4. Shneiderman & mantra tìm kiếm thông tin

Ben Shneiderman (*"The Eyes Have It"*, IEEE Symp. Visual Languages 1996) đúc kết: ***"Overview first, zoom and filter, then details-on-demand."***

Ông cũng liệt kê **7 tasks** mọi dashboard phải hỗ trợ: *overview, zoom, filter, details, relate, history, extract.*

- **History** = undo + URL-shareable filter state + bookmarkable view
- **Extract** = CSV/PNG/PDF export của current view *có metadata*

Đây là hai thứ SaaS analytics **vẫn thiếu tới 2026**, dù Shneiderman đã liệt kê từ 1996. Xem chúng là **baseline**, không phải feature.

---

## 5. Gestalt và sự nhóm không cần ngôn ngữ

Wertheimer / Koffka (1920s–1930s), được Ware và Few áp dụng cho viz:

- **Proximity** — gần → nhóm
- **Similarity** — cùng màu/hình → nhóm
- **Enclosure** — bao ngoài (tín hiệu mạnh nhất trong 3)
- **Closure, Continuity, Common Fate** (cùng chuyển động → brushing & linking)
- **Figure-ground, Connection**

**Dashboard tốt:**
- Gom `KPI + sparkline + delta` thành một *compound glyph* bằng proximity + enclosure
- Tách các section bằng whitespace
- Giữ **data là figure**, mọi thứ khác thành **ground**

---

## 6. Storytelling: Knaflic, Cairo, Segel–Heer

### Cole Nussbaumer Knaflic (*Storytelling with Data*, 2015)

Phân định rạch ròi **exploratory vs explanatory**: exploratory là *"wander through pearls"*; explanatory là *"show the gems."* Cơn bệnh kinh niên của dashboard là đem output exploratory phục vụ nhu cầu explanatory.

Liều thuốc: **"Big Idea" worksheet** (phỏng theo Nancy Duarte). Mỗi màn hình / widget phải tóm gọn trong **một câu hoàn chỉnh** nêu viewpoint, nói rõ *so what*, và ngụ ý hành động. Không viết được câu đó → dashboard chưa sẵn sàng.

### Alberto Cairo (*The Truthful Art*, 2016; *How Charts Lie*, 2019)

Định nghĩa 5 phẩm chất theo thứ tự ưu tiên: **truthful → functional → beautiful → insightful → enlightening**.

Quy tắc truncation nổi tiếng: *"zero baseline is required when the method of encoding is height or length"* — **bar/column/area không bao giờ cắt trục**; line chart được phép cắt nếu signal là slope, nhưng **Correll, Bertini & Franconeri** (CHI 2020, arXiv 1907.02035) chứng minh thực nghiệm rằng truncation làm phóng đại perceived effect size *ngay cả khi người xem biết trục bị cắt* → phải annotate rõ ràng.

### Segel & Heer (IEEE TVCG 2010, *"Narrative Visualization"*)

7 thể loại và 3 cấu trúc lai giữa author-driven và reader-driven:

- **Martini Glass** — thân trước: author-driven insight. Ly sau: reader-driven exploration.
- **Interactive Slideshow**
- **Drill-Down Story**

Hầu hết dashboard SaaS là *partitioned poster* giả danh *annotated chart* — cần cam kết một trong hai, không được lưỡng lự.

### Amanda Cox (NYT Upshot, 2012)

> *"The annotation layer is the most important thing we do… otherwise it's a case of here it is, you go figure it out."*

---

## 7. UX nghiên cứu thực nghiệm (Nielsen Norman Group)

**Laubheimer** (NN/g, 2017) và **Moran** (NN/g, 2022) đưa 3 khuyến nghị trụ cột:

1. Mã hóa định lượng bằng **length / 2-D position**, không phải area / angle / color
2. Cắt chartjunk để tận dụng **preattentive processing**
3. Cung cấp **context và contrast** qua title analytical, direct label, baseline tham chiếu

### Scanning patterns — sự thật về "F-pattern / Z-pattern"

Cả F-pattern lẫn Z-pattern **không áp dụng thuần** cho dashboard. Điều thực sự áp dụng:

- **Top-left bias** (NN/g 2010): 69% thời gian ở nửa trái, chỉ 1% qua horizontal fold
- **Above-the-fold** vẫn thật (Budiu 2018): 57% time above fold, 74% trong hai screenful đầu
- **Layer-cake skimming** qua tile title + KPI value

### Miller's 7±2 — huyền thoại khi áp vào UI

Miller (1956) mô tả short-term memory cho **novel chunks** mà người ta phải *nhớ*. Cowan (2001) hiệu chỉnh xuống ~4. Nhưng **dashboard hiển thị**, không yêu cầu nhớ — nên Miller không phải hard limit. Điều đáng giữ là **chunking qua visual grouping**, không phải số đếm tuyệt đối.

### Hick's Law & Fitts's Law

- **Hick's Law** — thời gian quyết định tăng log với số lựa chọn → bộ lọc 30+ toggle cần group, default-collapse, hoặc drive bằng search
- **Fitts's Law** — hit-zone càng lớn + gần càng nhanh → đặc biệt cho hover target trên chart point, KPI card click-to-swap-Y-axis

---

## 8. Cognitive Load Theory (Sweller)

Sweller (1988, 2010) phân loại:

- **Intrinsic** — phức tạp vốn có của data/domain
- **Extraneous** — do trình bày kém
- **Germane** — dùng để học / xây mental model

**Đòn bẩy thiết kế nhắm vào extraneous:**
- Direct label thay vì legend (chống split-attention)
- Semantic color nhất quán
- Grid dự đoán được
- Xóa 3D / chartjunk
- Progressive disclosure

### Kosslyn 8 principles (*Graph Design for the Eye and Mind*, 2006)

Bộ heuristic review trực tiếp:

1. **Relevance**
2. **Appropriate knowledge**
3. **Salience**
4. **Discriminability**
5. **Perceptual organization**
6. **Compatibility**
7. **Informative changes** — mọi thay đổi tính chất phải mang ý nghĩa
8. **Capacity limitations**

---

## 9. Accessibility và color cho dashboard

### WCAG 2.2 cho data viz

- **1.4.1** — không dựa riêng vào color
- **1.4.3** — text 4.5:1, large text 3:1
- **1.4.11** — non-text và graphical objects 3:1 so với adjacent color
- **2.5.8** — target ≥24×24 CSS px (mới trong 2.2)
- **2.5.5** — AAA 44×44
- **2.4.7** — focus visible

### Chartability framework (Frank Elavsky, EuroVis 2022)

Mở rộng WCAG cho nhu cầu visual / motor / vestibular / neurological / cognitive trong domain viz. Chạy cùng axe-core làm CI check cho mọi PR mới thêm chart component.

### Color vision deficiency

- **~8% nam, ~0.5% nữ** — Wong (*Nature Methods*, 2011)
- **Palette mặc định khuyến nghị:**
  - **Okabe-Ito** (8 màu qualitative, Wong 2011) — categorical
  - **Viridis / Cividis** — sequential
  - **RdBu / BrBG** (ColorBrewer) — diverging
- **Không bao giờ chỉ dùng red/green** cho good/bad. Cặp thay thế: Okabe-Ito blue (`#56B4E9`) + orange (`#D55E00`), luôn kèm glyph `↑↓` và text label.

### Dark mode chart

- Không dùng pure black background (IBM Carbon dùng `#161616`)
- Desaturate ~15–25%
- Invert sequential palette (lightest = largest value)
- Verify 3:1 từng mark so với background
- Observable 10 và Carbon là hai reference implementation

---

## 10. Design system hiện hành (2024–2025)

### IBM Carbon

- 14 màu categorical apply đúng thứ tự
- 4 sequential monochromatic (Blue / Purple / Cyan / Teal)
- 2 diverging (Red–Cyan cho temperature, Purple–Teal cho các case khác)
- Alert palette semantic
- Dark mode background `#161616`

### Shopify Polaris Viz

- Purple default cho single series
- Grey cho past vs current comparison
- Green/red chỉ cho biased data
- **Tuyệt đối khuyến khích table** khi >6 discrete point hoặc cần lookup

### Atlassian

- 5–6 categorical color tối đa
- Border giữa các mark kề nhau (vì chart color không đạt 3:1 so với nhau)
- Không cho phép text overlay lên chart mark

### Apple HIG (Swift Charts)

- Sonification thành tiêu chuẩn a11y cho chart (default)

### Microsoft Fluent Charting

- 40 qualitative palette
- Semantic tokens theo theme OS

---

## 11. Thực tế SaaS dashboard 2025

### Stripe Merchant Dashboard

- Typography + spacing làm hierarchy (không phải màu)
- Màu hạn chế: tím `#635BFF` chỉ cho primary action
- Red/green chỉ cho payment state
- Không gauge / 3D / pie

### Linear

- Density cao + calm
- Inter 11–13px
- Sub-100ms interaction
- Keyboard-first: `Cmd+K`, `/` filter

### Vercel Analytics

- Traffic-light cho Core Web Vitals (một trong ít use case hợp pháp cho red/amber/green — threshold là industry-standard)
- Skeleton match card shape

### Datadog

- Grid 12 cột
- Timeseries ≥4 cols (<4 sẽ squashed)
- "High-density mode" split 2×12 cho TV NOC
- Widget bất đối xứng bị cấm

### Plausible

- One-page dashboard
- **Click KPI card → swap Y-axis của chart chính** — pattern này đáng lấy cho SaaS

### Shopify Admin

- 3 surface riêng biệt: Overview (strategic), Reports (analytical), Live View (operational)
- **In-context analytics** — hiển thị metric ngay trong workflow page, không bắt navigate sang Analytics

### GitHub contribution graph

- Calendar heatmap 7×52, single hue 5 bước
- Minh chứng: một chart chọn đúng có thể gánh cả section

---

## Tổng kết — 5 câu lõi

1. **Encoding quyết định correctness** — Cleveland–McGill ranking là luật bất biến (position > length > angle/area > color).
2. **Truthfulness trước đẹp** — zero baseline, disclosure, uncertainty band, break-down-by path cho Simpson.
3. **Annotation > chrome** — Amanda Cox: *"the annotation layer is the most important thing we do."*
4. **A11y là first-class** — WCAG 2.2 + Chartability là baseline, không phải retrofit.
5. **Dashboard là daily product** — consistency > cleverness, restraint > density, typography > color, evidence > opinion.
