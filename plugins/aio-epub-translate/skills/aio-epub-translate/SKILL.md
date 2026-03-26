---
name: aio-epub-translate
description: |
  Translate EPUB book chapters with literary Vietnamese quality via ConnectRPC API.
  Triggers: "dịch sách", "translate epub", "translate chapter", "dịch tiếp",
  "continue translating", "dịch chương", "translate book".
---

# EPUB Translate — Chapter Translation

Dịch nội dung EPUB bằng khả năng ngôn ngữ của Claude, submit bản dịch qua API.

> **Prerequisites**: Cần API key (`aio-epub-setup`) và sách đã upload (`aio-epub-upload`). Chưa có sách? Dùng `aio-epub-manage` để xem danh sách.

## API Setup

**LUÔN dùng Python** — KHÔNG dùng bash curl (JSON escaping lỗi với Unicode).

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

### 1. Parse URL (nếu user gửi link)

URL format: `https://read.aiocean.io/books/{bookId}/read/{filePath}`
- `filePath` có thể double-encoded: `Text%252Fchapter0018.html` → `Text/chapter0018.html`

### 2. Lấy context TRƯỚC KHI DỊCH

```python
# Lấy cross-chapter context (guideline + glossary + previous chapter summary)
context = api("GetChapterContext", {
    "bookId": BOOK_ID,
    "filePath": FILE_PATH
})
guideline = context.get("guideline", "")
chapter_guideline = context.get("chapterGuideline", "")
previous_summary = context.get("previousChapterSummary", "")
glossary = context.get("glossary", [])

print("=== GUIDELINE ===")
print(guideline)
if chapter_guideline:
    print("=== CHAPTER GUIDELINE ===")
    print(chapter_guideline)
if glossary:
    print("=== GLOSSARY (recurring terms) ===")
    for term in glossary:
        print(f"  {term['original']} → {term['translated']} (x{term['frequency']})")
if previous_summary:
    print("=== PREVIOUS CHAPTER (last paragraphs) ===")
    print(previous_summary[:500])
```

### 3. Lấy nội dung cần dịch

```python
page = api("GetPageJson", {
    "bookId": BOOK_ID,
    "filePath": FILE_PATH,
    "size": 0,    # 0 = tất cả
    "offset": 0
})
contents = page["contents"]
print(f"Total items: {len(contents)}")

# Filter items chưa dịch hoặc dịch kém
items_to_translate = []
for item in contents:
    translations = item.get("translations", [])
    if not translations or not translations[0].get("contentText", "").strip():
        items_to_translate.append(item)
print(f"Need translation: {len(items_to_translate)}")
```

### 4. Claude tự dịch — THEO NGUYÊN TẮC VĂN HỌC

**ĐỌC KỸ GUIDELINE** trước khi dịch — áp dụng mọi quy tắc trong đó.

Đọc `contentText` của từng item, dịch sang ngôn ngữ yêu cầu (mặc định: Vietnamese).
- Giữ nguyên HTML tags, chỉ dịch text content
- Giữ nguyên tên riêng trừ khi guideline nói khác
- Dịch theo batch: đọc ~10-15 items, dịch hết, submit batch

#### NGUYÊN TẮC DỊCH VĂN HỌC

**BẮT BUỘC đọc các reference files** trong thư mục `references/` trước khi dịch:

| File | Nội dung |
|------|----------|
| `references/translation-principles.md` | Nền tảng Tín-Đạt-Nhã, cấu trúc Đề-Thuyết, đặc trưng tiếng Việt |
| `references/sentence-structure.md` | Tách câu, chuyển bị động, bối cảnh trước hành động, chống danh từ hóa |
| `references/word-choice.md` | Hán-Việt vs thuần Việt, từ láy, thành ngữ, đại từ nhân xưng (bảng đầy đủ) |
| `references/rhythm-and-voice.md` | Nhịp chẵn, cân đối vế, giọng văn theo thể loại, bậc thầy văn xuôi Việt |
| `references/common-errors.md` | 6 loại lỗi phải tránh, xử lý văn hóa (Vinay & Darbelnet) |
| `references/structure-conversion-table.md` | Bảng chuyển đổi cấu trúc Anh→Việt, checklist tự kiểm tra |

**Tóm tắt nhanh** (đọc đầy đủ trong references):
- Dịch sense-by-sense, KHÔNG word-by-word
- Cấu trúc Đề-Thuyết, chuyển bị động sang chủ động
- Ưu tiên thuần Việt, dùng từ láy, thành ngữ
- Nhịp chẵn 2/2, 2/4, giữ phong cách tác giả
- Tránh: câu cứng theo tiếng Anh, lạm dụng bị động, sáo rỗng dịch thuật

### 5. Submit bản dịch — DÙNG BATCH API

**Luôn dùng `BatchCreateManualTranslation`** để submit tất cả translations trong 1 request.

```python
# Chuẩn bị batch items
batch_items = []
for item in items_to_translate:
    translated = translate(item["contentText"])  # Claude dịch
    batch_items.append({
        "contentId": item["contentId"],
        "translatedContent": translated,
        "targetLanguage": "Vietnamese"
    })

# Submit batch (1 API call thay vì N calls)
result = api("BatchCreateManualTranslation", {
    "bookId": BOOK_ID,
    "filePath": FILE_PATH,
    "items": batch_items
})
print(f"Created: {result['createdCount']}, Failed: {result['failedCount']}")
if result.get("failedContentIds"):
    print(f"Failed IDs: {result['failedContentIds']}")
```

**Dịch theo batch ~10-15 items** để giữ chất lượng. Lặp lại cho đến hết chapter.

### 6. Kiểm tra sau khi dịch

```python
# Verify progress
progress = api("GetTranslationProgress", {"bookId": BOOK_ID})
for fp in progress["progress"].get("fileProgress", []):
    pct = fp["translationPercentage"]
    status = "DONE" if pct == 100 else f"{pct:.0f}%"
    print(f"  {fp['filePath']}: {status}")
```

## Bước tiếp theo

| Bạn muốn... | Dùng skill |
|-------------|------------|
| Kiểm tra chất lượng bản dịch vừa làm | `aio-epub-quality` |
| Xem tiến độ tổng thể | `aio-epub-manage` |
| Chỉnh guideline cho chương tiếp | `aio-epub-manage` (phần Guidelines) |
| Xuất sách khi dịch xong | `aio-epub-export` |
| Dịch kém → re-translate | `aio-epub-quality` (phần Re-translate) |

**Workflow**: `aio-epub-setup` → `aio-epub-upload` → **`aio-epub-translate`** → `aio-epub-quality` → `aio-epub-export`

## Endpoints Summary

| API | Mục đích |
|-----|----------|
| `GetChapterContext` | Lấy guideline + glossary + previous chapter summary |
| `GetPageJson` | Lấy nội dung cần dịch |
| `BatchCreateManualTranslation` | Submit batch translations (1 call) |
| `GetTranslationProgress` | Kiểm tra tiến độ |
| `GetGuideline` | Lấy guideline riêng |
| `GetChapterGuideline` | Lấy chapter guideline |
