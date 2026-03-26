# Khung Đánh Giá Chất Lượng Dịch Thuật

Dựa trên MQM (Multidimensional Quality Metrics), ATA (American Translators Association), và DA-MQM/VERSE (2024), điều chỉnh cho dịch văn học EN→VI.

---

## 1. Phân Loại Lỗi (Error Typology)

### Bảy chiều MQM cho văn học EN→VI

| Chiều | Định nghĩa | Mức quan trọng |
|---|---|---|
| **Accuracy** | Bản dịch không tương ứng nội dung mệnh đề nguồn | Cao nhất |
| **Terminology** | Thuật ngữ lệch chuẩn domain/register | Cao (đặc biệt triết học/khoa học) |
| **Linguistic Conventions** (Fluency) | Ngữ pháp, chính tả, dấu thanh, câu cú | Cao |
| **Style** | Đúng ngữ pháp nhưng không phù hợp register | Cao |
| **Locale Conventions** | Vi phạm quy ước nội dung/định dạng Việt | Trung bình |
| **Audience Appropriateness** | Nội dung không phù hợp đối tượng đọc | Cao |
| **Textual Conventions** | Vi phạm quy ước diễn ngôn tiếng Việt | Cao |

### Phân loại chi tiết dưới Accuracy

- **Addition**: Nội dung không có trong nguồn (dịch giả tự thêm)
- **Omission**: Nội dung nguồn bị bỏ sót
- **Mistranslation**: Truyền tải sai nghĩa
- **Untranslated**: Giữ nguyên tiếng Anh không dịch
- **Over-translation**: Mở rộng nghĩa quá phạm vi nguồn
- **Under-translation**: Thu hẹp nghĩa dưới phạm vi nguồn

---

## 2. Mức Độ Nghiêm Trọng

| Mức | Điểm phạt | Định nghĩa |
|---|---|---|
| **Neutral** | 0 | Thay đổi tùy thích, không phải lỗi |
| **Minor** | 1 | Ảnh hưởng hạn chế đến khả năng đọc; vụng nhưng hiểu được |
| **Major** | 5 | Ảnh hưởng nghiêm trọng đến hiểu biết hoặc chất lượng văn học |
| **Critical** | 25 | Đoạn văn không đạt yêu cầu; trigger auto-fail |

---

## 3. Trọng Số Theo Chiều

| Chiều | Trọng số | Tương ứng Tín-Đạt-Nhã |
|---|---|---|
| Accuracy (nghĩa chính xác) | 35% | **Tín** (信) — không vi phạm |
| Fluency (chất lượng ngôn ngữ) | 25% | **Đạt** (達) — phải đọc tự nhiên |
| Style (giữ giọng văn) | 20% | **Nhã** (雅) — giữ phong cách tác giả |
| Cultural appropriateness | 12% | Quy ước bản địa, chuyển đổi thành ngữ |
| Consistency | 8% | Thuật ngữ, đại từ, register xuyên chương |

---

## 3b. Chiều Bổ Sung — DA-MQM/VERSE (2024)

Framework đánh giá văn học mới nhất (arxiv 2412.01340) bổ sung các chiều mà MQM tiêu chuẩn bỏ sót:

| Chiều | Thang | Định nghĩa | Đặc biệt quan trọng cho EN→VI |
|---|---|---|---|
| **Lexical Choice** | 1–5 | Chọn từ thành ngữ, biểu đạt thể hiện fluency tiếng đích | Từ láy, loại từ biểu cảm (nỗi vs sự), thuần Việt vs Hán-Việt |
| **Honorifics / Pronoun Register** | 1–5 | Đại từ/xưng hô phản ánh quan hệ nhân vật | **Chiều khó nhất** — tiếng Anh không có; mỗi "he/she/I" là quyết định sáng tạo |
| **Narrative Coherence** | 1–3 | Bản dịch duy trì tính nhất quán câu chuyện xuyên chương | Kiểm tra: plot points không bị đảo, cảm xúc arc giữ nguyên, foreshadowing không mất |

**Scoring VERSE**: Mỗi chiều chấm độc lập. Score 1-2 = cần sửa, 3-4 = acceptable, 5 = excellent.

---

## 3c. ATA — Hệ Thống Chấm Điểm Bổ Sung

American Translators Association dùng hệ thống phạt **lũy thừa** (khác MQM tuyến tính):

| ATA Category | Ví dụ | Điểm phạt |
|---|---|---|
| **Transfer errors** | Mistranslation, omission, addition, false sense | 2–16 (nghiêm trọng nhất) |
| **Mechanical errors** | Chính tả, dấu thanh, dấu câu, formatting | 1–2 |
| **Errors of language** | Cụm từ không thành ngữ, vi phạm ngữ pháp tiếng đích | 1–4 |
| **Errors of register** | Sai mức trang trọng, giọng văn không nhất quán | 2–8 |

**Ngưỡng ATA**: 0–17 điểm phạt = **ĐẠT** | 18+ điểm = **TRƯỢT**. Một lỗi critical (16 điểm) có thể auto-fail.

**Khi nào dùng ATA vs MQM**:
- MQM: đánh giá chi tiết, phân tích theo chiều, cải thiện liên tục
- ATA: đánh giá pass/fail nhanh, quyết định "đủ tốt để xuất bản chưa?"
- Nếu MQM ≥85 nhưng ATA fail → có lỗi nghiêm trọng đơn lẻ cần tìm

---

## 4. Thang Điểm và Ngưỡng

### Công thức tính (MQM Calibrated Score)

```
Penalty thô = (lỗi minor × 1) + (lỗi major × 5) + (lỗi critical × 25)
Penalty chuẩn hóa = Penalty thô × (100 / số từ đoạn đánh giá)
Quality Score = 100 − Penalty chuẩn hóa
```

Ví dụ: Đoạn 200 từ có 2 minor (2pt) + 1 major (5pt) = 7pt thô → 7 × (100/200) = 3.5 → Score = 96.5

### Ngưỡng đánh giá

| Điểm | Trạng thái | Hành động |
|---|---|---|
| 95–100 | **Xuất sắc** | Sẵn sàng xuất bản |
| 85–94 | **Tốt** | Polish nhẹ |
| 70–84 | **Chấp nhận được** | Sửa có mục tiêu |
| 60–69 | **Trung bình** | Sửa toàn diện các phần flagged |
| <60 | **Kém** | Dịch lại chương |

---

## 5. Red Flags — Dấu Hiệu Chất Lượng Kém

Xếp từ nghiêm trọng nhất đến ít nhất:

| Red Flag | Pattern | Mức |
|---|---|---|
| Calque thành ngữ sát nghĩa | "phá băng", "con voi trong phòng" | Critical/Major |
| Đại từ không nhất quán | "anh/em" → "anh/cô" giữa cảnh mà không đổi quan hệ | Major |
| Calque bị động | "bị [verb] bởi [agent]" | Major |
| Trật tự SVO xuyên suốt | Không có Topic-Comment inversion | Major |
| Calque copula | "Nó là quan trọng để..." | Major |
| Danh từ hóa quá mức | Chuỗi "sự + verb" nối tiếp | Minor–Major |
| Câu dài không tách | Câu 40+ từ giữ nguyên từ Anh | Minor–Major |
| Hán-Việt nặng trong register casual | "bi thương" trong đối thoại đời thường | Minor |
| Cụm sáo rỗng dịch thuật | "Nói một cách khác", "Sự thật là..." | Minor |
| Thiếu từ láy | "hơi lạnh" thay vì "se se lạnh" | Minor |
| Đối thoại phẳng | Nhân vật nói câu ngữ pháp đầy đủ, không tiểu từ | Minor–Major |
| Thiếu tiểu từ tình thái | Không ừ, ờ, à, nhé, nha trong đối thoại | Minor |
| Giọng tác giả bị xóa | Mọi chương đọc cùng giọng "dịch" trung tính | Major |

---

## 6. Checklist Thực Hành (Per-Paragraph)

### A. Semantic Fidelity (Accuracy — 35%)

- [ ] Không thêm nội dung không có trong nguồn
- [ ] Không bỏ sót nội dung có nghĩa (nhịp cảm xúc, cụm từ phẩm định)
- [ ] Thành ngữ và ẩn dụ truyền tải theo nghĩa, không word-by-word
- [ ] Tên riêng, số liệu, ngày tháng chính xác
- [ ] Sắc thái giữ nguyên: irony, understatement, ambiguity không bị san phẳng

### B. Natural Vietnamese Flow (Fluency — 25%)

- [ ] Không có calque bị động "bị + verb + bởi"
- [ ] Không có calque copula "là + adjective + để"
- [ ] Câu trên ~30 từ đã tách thành 2–3 câu ngắn
- [ ] Bối cảnh/điều kiện đặt trước hành động (Đề-Thuyết)
- [ ] Động từ chủ động thay vì cụm danh từ hóa
- [ ] Đọc to — không vấp; nhịp tự nhiên

### C. Style and Voice Preservation (20%)

- [ ] Register giọng văn tác giả giữ nguyên (tối giản/trữ tình/mỉa mai/đời thường)
- [ ] Đối thoại nghe như người thật nói, không phải văn dịch
- [ ] Câu ngắn nhấn mạnh giữ nguyên ngắn (không mở rộng)
- [ ] Từ láy dùng khi phù hợp để tăng biểu cảm
- [ ] Không có "cụm sáo rỗng dịch thuật"

### D. Cultural Appropriateness (12%)

- [ ] Thành ngữ Anh chuyển sang tương đương Việt hoặc giải thích
- [ ] Tham chiếu văn hóa xử lý phù hợp (giữ + gloss / thay thế / giải thích)
- [ ] Register Hán-Việt phù hợp ngữ cảnh
- [ ] Tên người/địa danh theo quy ước hiện hành

### E. Consistency (8%)

- [ ] Hệ thống đại từ nhất quán trong cảnh; shift có chủ đích
- [ ] Cách viết tên nhân vật nhất quán xuyên chương
- [ ] Từ vựng chủ đề lặp lại (e.g., "freedom", "hope") dịch cùng một thuật ngữ
- [ ] Markers thì/thể (đã, đang, sẽ, vừa, mới) dùng đúng và nhất quán

---

## 7. Ví Dụ Chấm Điểm

```
Source: "She found herself unable to speak, broken by what she had just witnessed."

Bản dịch kém (Score: ~70):
"Cô ấy thấy bản thân mình không có khả năng nói, bị gãy vỡ bởi những gì cô ấy vừa chứng kiến."
  Lỗi 1: [Style/Major/5] calque copula "thấy bản thân mình không có khả năng nói"
  Lỗi 2: [Fluency/Major/5] calque bị động "bị gãy vỡ bởi"
  Lỗi 3: [Style/Minor/1] lặp "cô ấy" — Việt tỉnh lược đại từ sau thiết lập

Bản dịch tốt (Score: 95+):
"Cô nghẹn lời. Những gì vừa xảy ra trước mắt đã đánh gục cô."
  → Gọn, tự nhiên, Topic-Comment, từ mạnh
```

---

## 8. Chiều Đặc Biệt Tiếng Việt: Đại Từ Nhân Xưng

Đây là chiều khó nhất (DA-MQM/VERSE, 2024). Mỗi lần dịch "he"/"she"/"I", phải quyết định sắc thái quan hệ.

**Lỗi đại từ phổ biến**:
- Không nhất quán cặp đại từ (anh/em vs anh/cô cùng cảnh) → **Major**
- Đại từ không đổi khi quan hệ đổi (cảnh đối đầu vẫn dùng "anh/em") → **Major**
- Mặc định "anh ấy/cô ấy" xuyên suốt (mặc định dịch máy) → **Minor–Major**

Xem `references/word-choice.md` phần B5 để tra bảng đại từ đầy đủ.
