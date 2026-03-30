---
name: aio-epub-analyze
description: Pre-translation analysis for EPUB books. Analyze writing style, characters, tone, and build glossary before translating. Triggers: "analyze book", "phân tích sách", "pre-translate", "chuẩn bị dịch", "book analysis", "character list", "danh sách nhân vật", "glossary", "thuật ngữ".
---

# EPUB Analyze — Pre-translation Intelligence

Phân tích sách TRƯỚC khi dịch: nhận diện nhân vật, writing style, tone, key terms → tạo guideline + glossary chính xác.

> **Khi nào dùng**: LUÔN chạy trước `aio-epub-translate` cho sách mới. Guideline từ phân tích thực tế tốt hơn hẳn template tự động.

## API Setup

```python
import json, urllib.request, os

BASE = "https://read-api.aiocean.dev/ListBooks.v1.BookService"
KEY = os.environ.get("JREAD_API_KEY", "duocnv")

def api(method, body):
    data = json.dumps(body).encode('utf-8')
    req = urllib.request.Request(f"{BASE}/{method}", data=data, headers={
        "Content-Type": "application/json",
        "X-License-Key": KEY
    })
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())
```

## Workflow

### 1. Lấy thông tin sách và TOC

```python
book = api("GetBook", {"bookId": BOOK_ID})
b = book["book"]
print(f"Title: {b['title']}")
print(f"Author: {b['author']}")
print(f"Language: {b['language']}")

toc = api("GetTableOfContent", {"bookId": BOOK_ID})
chapters = []
def collect_chapters(items):
    for item in items:
        if item.get("filePath"):
            chapters.append(item)
        if item.get("children"):
            collect_chapters(item["children"])
collect_chapters(toc["tableOfContent"]["items"])
print(f"Total chapters: {len(chapters)}")
```

### 2. Sample chapters — đầu, giữa, cuối

Đọc 3-5 chapters mẫu đại diện cho toàn bộ sách:

```python
# Chọn chapters mẫu: đầu, 1/3, giữa, 2/3, cuối
sample_indices = [0]
if len(chapters) > 4:
    sample_indices += [len(chapters)//4, len(chapters)//2, 3*len(chapters)//4]
sample_indices.append(len(chapters) - 1)
sample_indices = sorted(set(sample_indices))

samples = {}
for idx in sample_indices:
    ch = chapters[idx]
    page = api("GetPageJson", {
        "bookId": BOOK_ID,
        "filePath": ch["filePath"],
        "size": 0, "offset": 0
    })
    samples[ch["filePath"]] = {
        "title": ch["title"],
        "contents": page["contents"]
    }
    total_items = len(page["contents"])
    print(f"  [{idx}] {ch['title']}: {total_items} items")
```

### 3. Agent phân tích nội dung

Đọc nội dung các chapter mẫu và phân tích theo các tiêu chí sau:

#### A. Nhận diện thể loại
- Self-help / Business / Fiction / Science / Philosophy / Children's / Historical / Technical?
- Ảnh hưởng chiến lược dịch: xem `aio-epub-vn-style` → `genre-strategies.md`

#### B. Danh sách nhân vật + đại từ
Với mỗi nhân vật xuất hiện, xác định:

| Nhân vật | Vai trò | Đại từ gốc | Đại từ Việt | Ghi chú |
|----------|---------|-------------|-------------|---------|
| Elizabeth | Nhân vật chính, nữ | she/her | cô/nàng | Trẻ, mạnh mẽ |
| Mr. Darcy | Nhân vật chính, nam | he/him | anh/chàng | Lạnh lùng, quý tộc |
| Mrs. Bennet | Mẹ Elizabeth | she/her | bà | Lớn tuổi, lo lắng |

Tham khảo bảng đại từ trong `aio-epub-vn-style` → `word-choice.md` (8-cell pronoun table).

#### C. Writing style & tone
- Formal / Informal / Academic / Conversational / Poetic?
- Narrator voice: first-person / third-person / omniscient?
- Sentence length: short & punchy / long & complex / mixed?
- Đặc trưng riêng của tác giả (metaphors, humor, irony, rhetorical questions)?

#### D. Key terms & concepts
Liệt kê thuật ngữ quan trọng xuất hiện nhiều lần:

| Term (EN) | Đề xuất (VI) | Lý do chọn | Tần suất |
|-----------|-------------|-------------|----------|
| mindfulness | chánh niệm | Thuật ngữ Phật giáo quen thuộc | cao |
| resilience | sức bền bỉ | Thuần Việt, tránh "khả năng phục hồi" | trung bình |

#### E. Độ khó dịch
- Ước tính: Dễ / Trung bình / Khó / Rất khó
- Yếu tố gây khó: wordplay, cultural references, poetry, technical jargon?
- Chapters nào khó nhất? Tại sao?

### 4. Tạo guideline từ phân tích

Dựa trên kết quả phân tích, tạo guideline chi tiết:

```python
guideline = """
# Translation Guideline — {book_title}

## Thể loại: {genre}

## Phong cách dịch
- Tone: {tone_description}
- Giọng kể: {narrator_voice}
- Nhịp câu: {sentence_rhythm}

## Nhân vật & Đại từ
{character_table}

## Thuật ngữ cố định
{glossary_table}

## Nguyên tắc riêng cho sách này
- {principle_1}
- {principle_2}
- {principle_3}

## Lưu ý đặc biệt
- {special_notes}
"""

# Save guideline
api("UpdateGuideline", {
    "bookId": BOOK_ID,
    "guideline": guideline
})
print("Guideline saved!")
```

### 5. Xem guideline hiện có (nếu có)

```python
existing = api("GetGuideline", {"bookId": BOOK_ID})
if existing.get("guideline"):
    print("=== EXISTING GUIDELINE ===")
    print(existing["guideline"])
    print("\n→ Merge với kết quả phân tích mới, KHÔNG ghi đè nếu guideline cũ có thông tin tốt.")
```

## Output mẫu

Kết quả phân tích nên có dạng:

```
📖 Book Analysis: "Atomic Habits" by James Clear

Genre: Self-help / Behavioral Psychology
Difficulty: Trung bình
Tone: Conversational, motivational, evidence-based

Characters: Không có nhân vật chính (non-fiction)
Narrator: First-person (tác giả), dùng "tôi"

Key Terms (15):
  habit loop → vòng lặp thói quen
  cue → tín hiệu
  craving → khao khát
  response → phản hồi
  reward → phần thưởng
  identity-based habits → thói quen dựa trên bản sắc
  ...

Translation Strategy:
  - Giữ tone conversational, tránh academic
  - Dịch ví dụ thực tế sát nghĩa, giữ tên riêng
  - Thuật ngữ khoa học: ưu tiên thuần Việt, ghi chú gốc Anh lần đầu
  - Câu ngắn, nhịp nhanh — giữ đúng style tác giả
```

## Điều hướng

| Bạn muốn... | Dùng skill |
|-------------|------------|
| Bắt đầu dịch sau khi phân tích | `aio-epub-translate` |
| Nạp kiến thức dịch văn học | `aio-epub-vn-style` |
| Xem/chỉnh guideline | `aio-epub-manage` (phần Guidelines) |
| Quản lý sách | `aio-epub-manage` |

**Workflow**: `aio-epub-setup` → `aio-epub-upload` → **`aio-epub-analyze`** → `aio-epub-translate` → `aio-epub-quality` → `aio-epub-review` → `aio-epub-export`
