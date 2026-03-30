---
name: aio-epub-translate
description: Translate EPUB book chapters with literary Vietnamese quality via ConnectRPC API. Triggers: "dịch sách", "translate epub", "translate chapter", "dịch tiếp", "continue translating", "dịch chương", "translate book".
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

> **⚠️ DỪNG LẠI. KHÔNG ĐƯỢC DỊCH KHI CHƯA HOÀN THÀNH BƯỚC NÀY.**
>
> Bước này quyết định chất lượng bản dịch. Bỏ qua = bản dịch cứng, máy móc, bị reject.

**BƯỚC BẮT BUỘC — Nạp kiến thức dịch thuật:**

1. Dùng Skill tool gọi skill `aio-epub-vn-style` — đây là cẩm nang dịch văn học Anh→Việt
2. Sau khi SKILL.md của `aio-epub-vn-style` được load, đọc các reference files bằng cách resolve path:

```bash
REFS="${CLAUDE_PLUGIN_ROOT}/skills/aio-epub-vn-style/references"
echo "$REFS"
```

3. Dùng Read tool đọc các file reference theo thứ tự ưu tiên:

| Ưu tiên | File | Khi nào ĐỌC |
|---------|------|-------------|
| **LUÔN** | `$REFS/translation-principles.md` | Mọi lần dịch |
| **LUÔN** | `$REFS/common-errors.md` | Mọi lần dịch — tránh 6 lỗi phổ biến |
| **LUÔN** | `$REFS/sentence-structure.md` | Mọi lần dịch — cấu trúc Đề-Thuyết |
| **LUÔN** | `$REFS/word-choice.md` | Mọi lần dịch — đại từ, từ láy, Hán-Việt |
| Nên đọc | `$REFS/rhythm-and-voice.md` | Văn xuôi, fiction |
| Nên đọc | `$REFS/genre-strategies.md` | Khi biết thể loại sách |
| Nên đọc | `$REFS/vietnamese-linguistics.md` | Khi muốn dùng từ tượng thanh/hình, loại từ biểu cảm |
| Khi cần | `$REFS/advanced-techniques.md` | Khi gặp ẩn dụ, hài hước, chơi chữ |
| Khi cần | `$REFS/structure-conversion-table.md` | Bảng chuyển đổi cấu trúc nhanh |
| Khi cần | `$REFS/quality-rubric.md` | Khi tự đánh giá chất lượng |

4. **GATE — Xác nhận đã đọc**: Trước khi dịch câu đầu tiên, liệt kê ngắn gọn:
   - Thể loại sách (self-help, fiction, science, philosophy...?)
   - Đại từ sẽ dùng cho nhân vật chính (tôi/mình/ta? anh/cô/em?)
   - 2-3 nguyên tắc dịch sẽ ưu tiên áp dụng cho sách này

**Nếu không thể gọi skill hoặc resolve path**, áp dụng tối thiểu:
- Dịch sense-by-sense, KHÔNG word-by-word
- Cấu trúc Đề-Thuyết: bối cảnh trước, hành động sau
- Chuyển bị động sang chủ động ("bị X bởi Y" → "Y khiến X")
- Ưu tiên thuần Việt, dùng từ láy, thành ngữ khi phù hợp
- Nhịp chẵn 2/2, 2/4, giữ phong cách tác giả
- Tránh: câu cứng theo tiếng Anh, lạm dụng bị động, sáo rỗng dịch thuật ("Nói một cách khác", "Sự thật là...")

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

### 7. Sửa bản dịch cụ thể

Khi cần sửa 1 bản dịch đã submit (không cần dịch lại cả batch):

```python
# Lấy translationId từ GetPageJson
page = api("GetPageJson", {"bookId": BOOK_ID, "filePath": FILE_PATH, "size": 0, "offset": 0})
for item in page["contents"]:
    for t in item.get("translations", []):
        # t["translationId"] là ID cần dùng
        pass

# Sửa bản dịch — dùng translationId, KHÔNG phải contentId
result = api("EditTranslation", {
    "bookId": BOOK_ID,
    "filePath": FILE_PATH,
    "translationId": TRANSLATION_ID,
    "content": "Nội dung đã sửa..."
})
```

> **Chú ý**: `EditTranslation` dùng `translationId` (từ `translations[].translationId` trong GetPageJson) và `content` (không phải `contentId` hay `translatedContent`).

### 8. Sửa nhiều bản dịch cross-chapter

Khi cần sửa nhiều translations xuyên nhiều chapters (ví dụ: đổi thuật ngữ toàn sách):

```python
result = api("BulkEditTranslation", {
    "bookId": BOOK_ID,
    "edits": [
        {
            "filePath": "xhtml/ch01.html",
            "contentId": "id-1",
            "translatedContent": "Bản dịch sửa 1"
        },
        {
            "filePath": "xhtml/ch05.html",
            "contentId": "id-2",
            "translatedContent": "Bản dịch sửa 2"
        }
    ]
})
print(f"Updated: {result.get('updatedCount', 0)}, Failed: {result.get('failedCount', 0)}")
if result.get("failedEdits"):
    for f in result["failedEdits"]:
        print(f"  FAIL: {f['filePath']} {f['contentId']}: {f['error']}")
```

### 9. Cập nhật batch trong 1 chapter

Khi có sẵn JSON chứa nhiều bản dịch cần cập nhật (thay thế translations hiện có):

```python
result = api("UpdatePageJson", {
    "bookId": BOOK_ID,
    "filePath": FILE_PATH,
    "contents": [
        {
            "contentId": "id-1",
            "translations": [{"contentText": "Bản dịch mới 1"}]
        },
        {
            "contentId": "id-2",
            "translations": [{"contentText": "Bản dịch mới 2"}]
        }
    ]
})
print(result["message"])
```

> `UpdatePageJson` thay thế translations trong 1 chapter. `BulkEditTranslation` sửa cross-chapter.

## Endpoints Summary

| API | Mục đích |
|-----|----------|
| `GetChapterContext` | Lấy guideline + glossary + previous chapter summary |
| `GetPageJson` | Lấy nội dung cần dịch |
| `BatchCreateManualTranslation` | Submit batch translations mới (1 call) |
| `EditTranslation` | Sửa 1 bản dịch (dùng `translationId` + `content`) |
| `BulkEditTranslation` | Sửa nhiều bản dịch cross-chapter |
| `UpdatePageJson` | Cập nhật batch translations trong 1 chapter |
| `GetTranslationProgress` | Kiểm tra tiến độ |
| `GetGuideline` | Lấy guideline riêng |
| `GetChapterGuideline` | Lấy chapter guideline |
