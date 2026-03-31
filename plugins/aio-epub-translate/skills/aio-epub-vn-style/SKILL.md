---
name: aio-epub-vn-style
description: Use when translating Vietnamese literature, asking how to translate naturally, reviewing a translated passage for quality, or needing guidance on word choice, sentence rhythm, genre style, or common errors. Triggers: "dịch sao cho hay", "dịch thế nào", "phong cách dịch", "nguyên tắc dịch", "translation style", "how to translate", "dịch văn học", "style guide".
when_to_use: dịch sao cho hay, dịch thế nào, phong cách dịch, nguyên tắc dịch, translation style, how to translate, dịch văn học, style guide, word choice, sentence rhythm, genre style, Vietnamese literary style, Tín Đạt Nhã
effort: low
---

# Vietnamese Literary Translation — Style Guide

Cẩm nang dịch văn học Anh→Việt. Dùng standalone hoặc như prerequisite cho `aio-epub-translate` và `aio-epub-quality`.

## Khi nào dùng skill này

- **Standalone**: Khi cần tra cứu nguyên tắc dịch, hỏi "dịch câu này thế nào cho hay"
- **Prerequisite**: Được `aio-epub-translate` và `aio-epub-quality` yêu cầu đọc trước khi làm việc
- **Training**: Khi muốn hiểu sâu về dịch thuật Anh→Việt

## Nền tảng: Tín · Đạt · Nhã

Ba tiêu chuẩn đánh giá bản dịch (Nghiêm Phục, 1898):

- **Tín** (faithfulness): Trung thành với ý nghĩa và tinh thần nguyên tác — truyền tải đúng tư tưởng, cảm xúc, ý đồ tác giả. Không dịch sát từng từ.
- **Đạt** (comprehensibility): Mạch lạc, dễ hiểu. Người đọc lĩnh hội nội dung một cách tự nhiên.
- **Nhã** (elegance): Bản dịch uyển chuyển, mang vẻ đẹp ngôn từ riêng.

**Nguyên tắc cốt lõi**: Dịch sense-by-sense (theo nghĩa), không word-by-word (theo từ). Bản dịch tốt là bản mà người Việt đọc lên và nói "Đúng, chúng tôi nói như vậy." (Dynamic equivalence — Eugene Nida)

## Cây quyết định nhanh

| Bạn gặp vấn đề gì? | Đọc reference |
|---|---|
| Câu dài, cứng, không tự nhiên | `references/sentence-structure.md` |
| Chọn từ Hán-Việt hay thuần Việt? Đại từ nào? | `references/word-choice.md` |
| Câu đọc lên bị "vấp", không xuôi | `references/rhythm-and-voice.md` |
| Câu có mùi "dịch máy" | `references/common-errors.md` |
| Cần chuyển đổi cấu trúc Anh→Việt | `references/structure-conversion-table.md` |
| Nền tảng lý thuyết dịch thuật | `references/translation-principles.md` |
| Dịch sách thuộc thể loại cụ thể (self-help, fiction, science...) | `references/genre-strategies.md` |
| Kỹ thuật nâng cao (bù đắp, liên kết, ẩn dụ, hài hước) | `references/advanced-techniques.md` |
| Khai thác đặc trưng tiếng Việt (loại từ, tiểu từ, tượng thanh/hình) | `references/vietnamese-linguistics.md` |
| Đánh giá chất lượng bản dịch | `references/quality-rubric.md` |

## Tiêu chí đánh giá chất lượng (tóm tắt)

Dựa trên MQM (Multidimensional Quality Metrics) + ATA, điều chỉnh cho EN→VI văn học:

| Tiêu chí | Trọng số | Mô tả |
|---|---|---|
| Accuracy (Tín) | 35% | Đúng nghĩa, không thêm bớt, tên riêng/số liệu chính xác |
| Fluency (Đạt) | 25% | Đọc tự nhiên, không calque, không bị động thừa |
| Style (Nhã) | 20% | Giữ giọng văn tác giả, từ láy, nhịp điệu |
| Cultural fit | 12% | Thành ngữ, ẩn dụ, Hán-Việt/thuần Việt phù hợp |
| Consistency | 8% | Đại từ, thuật ngữ, giọng văn nhất quán |

**Thang điểm**: 95-100 (Xuất sắc) → 85-94 (Tốt) → 70-84 (Chấp nhận được) → 60-69 (Cần sửa) → <60 (Dịch lại)

## Checklist tự kiểm tra (sau mỗi batch)

1. **Tín**: Đủ ý? Không thêm, không bớt? Tên riêng/số liệu chính xác?
2. **Đạt**: Có câu nào "nghe lạ"? Có bị động thừa? Có cụm từ "sáo rỗng dịch thuật"?
3. **Nhã**: Nhịp chẵn? Vế cân đối? Có dùng từ láy, thành ngữ khi có thể?
4. **Giọng văn**: Nhất quán? Đối thoại khác trần thuật? Cảm xúc nguyên tác còn nguyên?
5. **Phép thử cuối**: Che nguyên tác đi — bản dịch đọc được như tác phẩm viết bằng tiếng Việt không?

## Reference Files

**Resolve path** để đọc reference files bằng Read tool:

```bash
REFS="${CLAUDE_PLUGIN_ROOT}/skills/aio-epub-vn-style/references"
echo "$REFS"
```

Sau đó dùng Read tool: `Read($REFS/translation-principles.md)`, v.v.

| File | Nội dung |
|------|----------|
| `references/translation-principles.md` | Nền tảng Tín-Đạt-Nhã, cấu trúc Đề-Thuyết, đặc trưng tiếng Việt |
| `references/sentence-structure.md` | Tách câu, chuyển bị động, bối cảnh trước hành động, chống danh từ hóa |
| `references/word-choice.md` | Hán-Việt vs thuần Việt, từ láy, thành ngữ, đại từ nhân xưng (bảng đầy đủ) |
| `references/rhythm-and-voice.md` | Nhịp chẵn, cân đối vế, giọng văn theo thể loại, bậc thầy văn xuôi Việt |
| `references/common-errors.md` | 6 loại lỗi phải tránh, xử lý văn hóa (Vinay & Darbelnet) |
| `references/structure-conversion-table.md` | Bảng chuyển đổi cấu trúc Anh→Việt, checklist tự kiểm tra |
| `references/genre-strategies.md` | Chiến lược dịch theo thể loại: self-help, fiction, science, philosophy, children's, historical |
| `references/advanced-techniques.md` | Bù đắp (compensation), liên kết văn bản, ẩn dụ, hài hước, thuật ngữ chuyên ngành |
| `references/vietnamese-linguistics.md` | Loại từ, tiểu từ tình thái, từ tượng thanh/hình, tu từ, thiết bị văn học |
| `references/quality-rubric.md` | Khung đánh giá MQM/ATA, phân loại lỗi, rubric chấm điểm, red flags |

## Liên kết với các skill khác

| Skill | Cách dùng vn-style |
|-------|---------------------|
| `aio-epub-translate` | Đọc vn-style TRƯỚC khi dịch — áp dụng nguyên tắc vào từng batch |
| `aio-epub-quality` | Dùng quality-rubric để đánh giá sâu hơn mechanical checks |
