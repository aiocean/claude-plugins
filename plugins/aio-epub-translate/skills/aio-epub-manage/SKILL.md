---
name: aio-epub-manage
description: |
  Browse books, check translation progress, manage guidelines, view TOC, fork books, publish to community, reset chapters, and view usage stats.
when_to_use: list books, liệt kê sách, check progress, xem tiến độ, update guideline, cập nhật guideline, book info, thông tin sách, fork book, nhân bản sách, publish book, đăng sách, community books, sách cộng đồng, reset book, reset chapter, usage stats, thống kê, browse books, translation progress, TOC
argument-hint: book ID (optional)
---

# EPUB Manage — Book Management

Browse, monitor, and manage EPUB books on the translation server.

> **Hub skill**: Dùng skill này để điều hướng. Cần upload? → `aio-epub-upload`. Cần dịch? → `aio-epub-translate`. Cần kiểm tra? → `aio-epub-quality`. Cần xuất? → `aio-epub-export`.

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

## Operations

### List Books

```python
books = api("ListBooks", {"pageSize": 50, "pageNumber": 1})
for book in books.get("books", []):
    print(f"  {book['id'][:40]}...")
    print(f"    Title: {book['title']}")
    print(f"    Author: {book['author']}")
```

### Get Book Info

```python
book = api("GetBook", {"bookId": BOOK_ID})
b = book["book"]
print(f"Title: {b['title']}")
print(f"Author: {b['author']}")
print(f"Language: {b['language']}")
print(f"Pages: {b.get('pageCount', 'N/A')}")
```

### View Table of Contents

```python
toc = api("GetTableOfContent", {"bookId": BOOK_ID})
def print_toc(items, indent=0):
    for item in items:
        prefix = "  " * indent
        print(f"{prefix}{item['title']} -> {item['filePath']}")
        if item.get("children"):
            print_toc(item["children"], indent + 1)

print_toc(toc["tableOfContent"]["items"])
```

### Update TOC (structured)

Dùng `UpdateTableOfContent` để lưu TOC đã chỉnh sửa — không cần XML:

```python
# Workflow: get → chỉnh sửa items → save
toc = api("GetTableOfContent", {"bookId": BOOK_ID})
items = toc["tableOfContent"]["items"]

# Ví dụ: sửa title của chapter đầu tiên
items[0]["title"] = "Chapter 1: The Beginning"

result = api("UpdateTableOfContent", {
    "bookId": BOOK_ID,
    "tableOfContent": {"items": items}
})
print(result["message"])
```

### Generate TOC với AI

```python
result = api("GenerateTOC", {
    "bookId": BOOK_ID,
    "modelId": "claude-sonnet-4-6",
    "language": "vi"
})
# Note: GenerateTOC trả về {"toc": ...}, khác với GetTableOfContent {"tableOfContent": ...}
items = result["toc"]["items"]
# Save bằng UpdateTableOfContent (same pattern as structured update above)
api("UpdateTableOfContent", {"bookId": BOOK_ID, "tableOfContent": {"items": items}})
```

> **Tip**: `GetTableOfContent` + `UpdateTableOfContent` là cặp API chính để đọc/ghi TOC với structured data. `GetTOC`/`UpdateTOC` (raw NCX XML) chỉ dùng khi cần thao tác XML trực tiếp ở mức thấp.

### Repair Book Metadata

Dùng khi cover image không hiển thị hoặc metadata thiếu (tác giả, ngôn ngữ...):

```python
result = api("RepairBookMeta", {"bookId": BOOK_ID})
print(result["message"])
print(f"Cover URL: {result.get('coverImageUrl', 'none')}")
```

### Check Translation Progress

```python
progress = api("GetTranslationProgress", {"bookId": BOOK_ID})
p = progress["progress"]
print(f"Overall: {p['translationPercentage']:.1f}% ({p['translatedElements']}/{p['totalContentElements']})")

for fp in p.get("fileProgress", []):
    pct = fp["translationPercentage"]
    total = fp["totalContentElements"]
    done = fp["translatedElements"]
    status = "DONE" if pct == 100 else f"{pct:.0f}%"
    indicator = "✓" if pct == 100 else ("◐" if pct > 0 else "○")
    print(f"  {indicator} {fp['filePath']}: {status} ({done}/{total})")
```

### View/Update Guidelines

```python
# View book guideline
gl = api("GetGuideline", {"bookId": BOOK_ID})
print(gl["guideline"])

# Update book guideline
api("UpdateGuideline", {
    "bookId": BOOK_ID,
    "guideline": "Updated guideline text..."
})

# View chapter guideline
cgl = api("GetChapterGuideline", {
    "bookId": BOOK_ID,
    "chapterPath": FILE_PATH
})
if cgl.get("exists"):
    print(cgl["guideline"])

# Update chapter guideline
api("UpdateChapterGuideline", {
    "bookId": BOOK_ID,
    "chapterPath": FILE_PATH,
    "guideline": "Chapter-specific guideline..."
})
```

### Generate AI Guideline

```python
result = api("GenerateGuideline", {
    "bookId": BOOK_ID,
    "sourceLanguage": "en",
    "targetLanguage": "vi",
    "templateName": "literary",
    "modelId": ""
})
print(result["guideline"])
```

### Delete Book

```python
result = api("DeleteBook", {"bookId": BOOK_ID})
print(result["message"])
```

### Fork Book

Nhân bản sách để tạo bản dịch riêng mà không ảnh hưởng bản gốc:

```python
result = api("ForkBook", {
    "bookId": BOOK_ID,
    "title": "My Translation of Book Title"
})
new_book_id = result["bookId"]
print(f"Forked: {new_book_id}")
```

### Publish / Unpublish Book

Đăng sách lên community hoặc gỡ xuống:

```python
# Publish
result = api("PublishBook", {"bookId": BOOK_ID})
print(result["message"])

# Unpublish
result = api("UnpublishBook", {"bookId": BOOK_ID})
print(result["message"])
```

### List Community Books

Duyệt sách đã được cộng đồng đăng:

```python
books = api("ListCommunityBooks", {"pageSize": 50, "pageNumber": 1})
for book in books.get("books", []):
    print(f"  {book['title']} — {book['author']}")
```

### Reset Book

Reset toàn bộ sách về trạng thái gốc (xóa folder unpacked, giải nén lại, prepare lại):

```python
result = api("ResetBook", {"bookId": BOOK_ID})
print(result["message"])
```

> **Cẩn thận**: Mất toàn bộ bản dịch và markings. Dùng khi sách bị lỗi nghiêm trọng.

### Reset Chapter

Reset 1 chapter — xóa bản dịch VÀ markings, trả về trạng thái gốc:

```python
result = api("ResetChapter", {
    "bookId": BOOK_ID,
    "filePath": FILE_PATH
})
print(result["message"])
```

> Khác với `RemarkChapter` (chỉ xóa bản dịch, giữ markings). Dùng `ResetChapter` khi cần re-mark lại từ đầu.

### Remark Chapter (remove translations, keep markings)

```python
result = api("RemarkChapter", {
    "bookId": BOOK_ID,
    "filePath": FILE_PATH
})
print(result["message"])
```

> Sau khi remark, dùng `aio-epub-translate` để dịch lại chương này.

### View Page Content

Xem nội dung HTML của 1 trang:

```python
page = api("GetPage", {
    "bookId": BOOK_ID,
    "filePath": FILE_PATH
})
print(page["content"][:2000])  # Preview first 2000 chars
```

### View LLM Usage Stats

Xem thống kê token và chi phí cho 1 cuốn sách:

```python
usage = api("GetLLMUsage", {"bookId": BOOK_ID})
for entry in usage.get("usage", []):
    print(f"  Model: {entry['model']}")
    print(f"  Tokens: {entry['inputTokens']} in / {entry['outputTokens']} out")
    print(f"  Cost: ${entry['cost']:.4f}")
```

### Search Translations

Tìm kiếm text trong bản gốc hoặc bản dịch xuyên toàn bộ sách:

```python
# Tìm trong bản gốc
results = api("SearchTranslations", {
    "bookId": BOOK_ID,
    "query": "self",
    "scope": "SEARCH_SCOPE_ORIGINAL",
    "limit": 20
})
print(f"Found: {results['totalCount']}")
for r in results.get("results", []):
    print(f"  [{r['filePath']}] EN: {r['originalText'][:80]}")
    print(f"               VI: {r.get('translatedText', '(chưa dịch)')[:80]}")

# Tìm trong bản dịch
results = api("SearchTranslations", {
    "bookId": BOOK_ID,
    "query": "bản ngã",
    "scope": "SEARCH_SCOPE_TRANSLATION",
    "limit": 20
})

# Tìm cả hai
results = api("SearchTranslations", {
    "bookId": BOOK_ID,
    "query": "anxiety",
    "scope": "SEARCH_SCOPE_BOTH",
    "limit": 20
})
```

### Glossary Management

Quản lý thuật ngữ cố định cho sách:

```python
# Xem glossary
glossary = api("GetGlossary", {"bookId": BOOK_ID})
for entry in glossary.get("entries", []):
    note = f" ({entry['note']})" if entry.get("note") else ""
    print(f"  {entry['original']} → {entry['translated']}{note}")

# Thêm term
api("AddGlossaryTerm", {
    "bookId": BOOK_ID,
    "original": "ego",
    "translated": "cái tôi",
    "note": "Thuật ngữ phân tâm học"
})

# Thay thế toàn bộ glossary
api("UpdateGlossary", {
    "bookId": BOOK_ID,
    "entries": [
        {"original": "self", "translated": "bản ngã", "note": ""},
        {"original": "ego", "translated": "cái tôi", "note": ""}
    ]
})

# Xóa term
api("DeleteGlossaryTerm", {
    "bookId": BOOK_ID,
    "original": "term_to_remove"
})
```

> Glossary thủ công được merge tự động với auto-generated glossary trong `GetChapterContext`. Glossary thủ công ưu tiên khi conflict.

### Book Statistics

Xem thống kê word count và chapter sizes:

```python
stats = api("GetBookStats", {"bookId": BOOK_ID})
print(f"Chapters: {stats['totalChapters']}")
print(f"Original words: {stats['totalOriginalWords']}")
print(f"Translated words: {stats['totalTranslatedWords']}")
print(f"Translation ratio: {stats['avgTranslationRatio']:.1%}")
print(f"Longest: {stats['longestChapter']['filePath']} ({stats['longestChapter']['wordCount']} words)")
print(f"Shortest: {stats['shortestChapter']['filePath']} ({stats['shortestChapter']['wordCount']} words)")
```

## Điều hướng

| Bạn muốn... | Dùng skill |
|-------------|------------|
| Setup API key lần đầu | `aio-epub-setup` |
| Upload sách mới | `aio-epub-upload` |
| Dịch một chương | `aio-epub-translate` |
| Kiểm tra chất lượng bản dịch | `aio-epub-quality` |
| Xuất sách đã dịch | `aio-epub-export` |

**Workflow**: `aio-epub-setup` → `aio-epub-upload` → `aio-epub-translate` → `aio-epub-quality` → `aio-epub-export`
