---
name: aio-epub-review
description: Deep literary review of translated EPUB chapters. Evaluate translation quality, fix consistency issues, and check cross-chapter coherence. Triggers: "review translation", "đánh giá bản dịch", "review chapter", "kiểm tra dịch", "consistency check", "kiểm tra nhất quán", "fix translation", "sửa bản dịch", "literary review".
---

# EPUB Review — Deep Literary Review

Đánh giá chất lượng dịch thuật ở mức văn học — không chỉ check cơ học (empty/short) mà phân tích tone, fluency, consistency, style.

> **Khác với `aio-epub-quality`**: Quality skill check cơ học (empty, mixed language, too short). Review skill đọc và đánh giá CHẤT LƯỢNG VĂN HỌC bằng khả năng ngôn ngữ của Agent.

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

### 1. Nạp tiêu chuẩn đánh giá

**BƯỚC BẮT BUỘC** — Đọc rubric trước khi review:

```bash
REFS="${CLAUDE_PLUGIN_ROOT}/skills/aio-epub-vn-style/references"
echo "$REFS"
```

Đọc các file reference:

| File | Nội dung |
|------|----------|
| `$REFS/quality-rubric.md` | MQM/ATA framework, error classification, scoring |
| `$REFS/common-errors.md` | 6 lỗi phổ biến cần phát hiện |
| `$REFS/translation-principles.md` | Tín-Đạt-Nhã criteria |

### 2. Lấy guideline + glossary

```python
# Book guideline — tiêu chuẩn đã đặt ra khi analyze
gl = api("GetGuideline", {"bookId": BOOK_ID})
guideline = gl.get("guideline", "")

# Chapter context — glossary + previous chapter
context = api("GetChapterContext", {
    "bookId": BOOK_ID,
    "filePath": FILE_PATH
})
glossary = context.get("glossary", [])
```

### 3. Đọc bản gốc + bản dịch

```python
page = api("GetPageJson", {
    "bookId": BOOK_ID,
    "filePath": FILE_PATH,
    "size": 0, "offset": 0
})
contents = page["contents"]

# Hiển thị song song original ↔ translation
for item in contents:
    original = item.get("contentText", "")
    translations = item.get("translations", [])
    translated = translations[0].get("contentText", "") if translations else ""
    content_id = item.get("contentId", "")

    if translated:
        print(f"[{content_id}]")
        print(f"  EN: {original[:200]}")
        print(f"  VI: {translated[:200]}")
        print()
```

### 4. Agent đánh giá — Tín Đạt Nhã

Đọc từng cặp original/translation và đánh giá theo 5 tiêu chí:

#### A. Tín (Accuracy — 35%)
- Nghĩa có đúng không? Có bỏ sót thông tin không?
- Có thêm thông tin không có trong bản gốc không?
- Tên riêng, số liệu, dữ kiện có chính xác không?

#### B. Đạt (Fluency — 25%)
- Đọc có tự nhiên bằng tiếng Việt không?
- Có câu nào "nghe tiếng Anh" không? (calque, cấu trúc bị động lạm dụng)
- Cấu trúc Đề-Thuyết có được áp dụng không?

#### C. Nhã (Style — 20%)
- Giọng văn có giữ đúng tone tác giả không?
- Có đúng thể loại không? (self-help ≠ academic, fiction ≠ report)
- Nhịp văn có mượt không? Có dùng từ láy, thành ngữ khi phù hợp?

#### D. Nhất quán (Consistency — 12%)
- Đại từ nhân vật có đúng với guideline không?
- Thuật ngữ có match glossary không?
- Tone có nhất quán trong suốt chapter?

#### E. Văn hóa (Cultural fit — 8%)
- Ẩn dụ, idiom có được chuyển ngữ phù hợp không?
- Có reference văn hóa cần localize không?

### 5. Phát hiện lỗi cụ thể

Tìm các pattern lỗi phổ biến (từ `common-errors.md`):

| Lỗi | Ví dụ sai | Sửa thành |
|-----|-----------|-----------|
| Calque (dịch sát từ) | "Cô ấy đã có một thời gian khó khăn" | "Cô ấy đã trải qua quãng thời gian chật vật" |
| Lạm dụng bị động | "Cuốn sách được viết bởi tác giả" | "Tác giả viết cuốn sách này" |
| Câu cứng cấu trúc Anh | "Nó là quan trọng rằng..." | "Điều quan trọng là..." |
| Đại từ không nhất quán | "anh ấy" → "hắn" → "anh ta" (cùng nhân vật) | Chọn 1 và dùng xuyên suốt |
| Từ sáo rỗng dịch thuật | "Nói một cách khác", "Sự thật là..." | Diễn đạt tự nhiên hơn |
| Mất giọng tác giả | Sách conversational → dịch ra academic | Giữ đúng tone |

### 6. Sửa lỗi trực tiếp

#### Sửa từng bản dịch cụ thể:

```python
result = api("EditTranslation", {
    "bookId": BOOK_ID,
    "filePath": FILE_PATH,
    "contentId": CONTENT_ID,
    "translatedContent": "Bản dịch đã sửa..."
})
print(result["message"])
```

#### Sửa nhiều bản dịch trong 1 chapter:

```python
result = api("UpdatePageJson", {
    "bookId": BOOK_ID,
    "filePath": FILE_PATH,
    "contents": [
        {
            "contentId": "id-1",
            "translations": [{"contentText": "Bản dịch sửa 1"}]
        },
        {
            "contentId": "id-2",
            "translations": [{"contentText": "Bản dịch sửa 2"}]
        }
    ]
})
print(f"Updated: {result['message']}")
```

### 7. Cross-chapter Consistency Check

Khi review nhiều chapters, kiểm tra nhất quán xuyên suốt:

```python
# Lấy nội dung nhiều chapters đã dịch
chapters_to_review = ["Text/chapter01.html", "Text/chapter05.html", "Text/chapter10.html"]

all_translations = {}
for fp in chapters_to_review:
    page = api("GetPageJson", {
        "bookId": BOOK_ID,
        "filePath": fp,
        "size": 0, "offset": 0
    })
    all_translations[fp] = page["contents"]
```

Agent kiểm tra across chapters:
- **Tên nhân vật**: cùng character có bị dịch khác nhau giữa các chapters?
- **Thuật ngữ**: cùng term có bị dịch 2 cách?
- **Tone shift**: chapter này formal, chapter kia informal bất ngờ?
- **Đại từ drift**: "anh" ở chapter 1, "anh ấy" ở chapter 5, "hắn" ở chapter 10?

### 8. Output — Quality Report

```
📊 Translation Review: Chapter 5 — "The Power of Small Wins"

Score: 82/100 (Good)
  Tín (Accuracy):    90/100 — 2 chỗ bỏ sót ý phụ
  Đạt (Fluency):     78/100 — 5 câu còn cứng theo cấu trúc Anh
  Nhã (Style):       85/100 — Tone đúng, nhưng thiếu từ láy
  Nhất quán:         75/100 — "habit" dịch 2 cách: "thói quen" & "tập quán"
  Văn hóa:           88/100 — OK

Issues Found: 8
  [FIXED] id-042: Calque "có một thời gian khó khăn" → "trải qua quãng chật vật"
  [FIXED] id-067: Bị động "được thực hiện bởi" → "do... thực hiện"
  [FIXED] id-089: Thuật ngữ "tập quán" → "thói quen" (match glossary)
  [FLAG]  id-103: Câu dài 4 dòng, cần tách — cần human review
  [FIXED] id-115: Đại từ "anh ta" → "anh" (match guideline)
  ...

Fixes Applied: 5/8
Needs Human Review: 3
```

## Review Modes

### Single Chapter Review
```
Agent: review chapter 5 of book X
→ Chạy steps 1-6 cho 1 chapter
```

### Multi-chapter Consistency
```
Agent: review chapters 1-10 for consistency
→ Chạy steps 1-7, focus on cross-chapter issues
```

### Full Book Review
```
Agent: review entire book X
→ Sample every chapter, focus on consistency + overall quality
→ Produce book-level report
```

## Điều hướng

| Bạn muốn... | Dùng skill |
|-------------|------------|
| Check cơ học trước (empty, mixed lang) | `aio-epub-quality` |
| Dịch lại chapter kém chất lượng | `aio-epub-translate` |
| Xem/update guideline | `aio-epub-manage` |
| Phân tích sách trước khi dịch | `aio-epub-analyze` |
| Xuất sách khi review xong | `aio-epub-export` |

**Workflow**: `aio-epub-setup` → `aio-epub-upload` → `aio-epub-analyze` → `aio-epub-translate` → `aio-epub-quality` → **`aio-epub-review`** → `aio-epub-export`
