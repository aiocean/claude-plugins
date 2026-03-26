---
name: aio-epub-upload
description: Upload and prepare EPUB books for translation. Triggers: "upload epub", "tải sách lên", "prepare book", "chuẩn bị sách", "add book".
---

# EPUB Upload & Prepare

Upload an EPUB file to the translation server and prepare it for translation.

> **Prerequisite**: Cần có API key. Chưa có? Dùng `aio-epub-setup` trước.

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

### 1. Upload EPUB

Read the EPUB file as bytes and upload:

```python
import base64

with open("path/to/book.epub", "rb") as f:
    epub_bytes = f.read()

# UploadEpub is streaming — use raw HTTP
data = json.dumps({
    "epubData": base64.b64encode(epub_bytes).decode(),
    "filename": "book.epub"
}).encode('utf-8')

req = urllib.request.Request(f"{BASE}/UploadEpub", data=data, headers={
    "Content-Type": "application/json",
    "X-License-Key": KEY
})
with urllib.request.urlopen(req) as resp:
    result = json.loads(resp.read())
    book_id = result["bookId"]
    print(f"Uploaded: {book_id}")
```

### 2. Prepare Book (if not auto-prepared)

```python
# PrepareBook cleans HTML, marks translatable content, generates guidelines
result = api("PrepareBook", {"bookId": book_id})
print(result["message"])
```

### 3. Generate Translation Guideline

```python
result = api("GenerateGuideline", {
    "bookId": book_id,
    "sourceLanguage": "en",
    "targetLanguage": "vi",
    "templateName": "literary",
    "modelId": ""  # uses default model
})
print(result["guideline"])
```

### 4. Verify Setup

```python
# Check book exists and has content
book = api("GetBook", {"bookId": book_id})
print(f"Title: {book['book']['title']}")
print(f"Author: {book['book']['author']}")

# Check TOC
toc = api("GetTableOfContent", {"bookId": book_id})
for item in toc["tableOfContent"]["items"]:
    print(f"  {item['title']} -> {item['filePath']}")

# Check translation progress (should be 0%)
progress = api("GetTranslationProgress", {"bookId": book_id})
print(f"Progress: {progress['progress']['translationPercentage']:.1f}%")
```

## Bước tiếp theo

| Bạn muốn... | Dùng skill |
|-------------|------------|
| Bắt đầu dịch chương đầu tiên | `aio-epub-translate` |
| Xem tiến độ và quản lý sách | `aio-epub-manage` |
| Chỉnh sửa guideline trước khi dịch | `aio-epub-manage` (phần Guidelines) |

**Workflow**: `aio-epub-setup` → **`aio-epub-upload`** → `aio-epub-translate` → `aio-epub-quality` → `aio-epub-export`
