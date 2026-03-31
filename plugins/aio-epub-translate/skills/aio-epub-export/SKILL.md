---
name: aio-epub-export
description: Pack and export translated EPUB books. Bilingual or translation-only output. Triggers: "export epub", "xuất sách", "pack epub", "đóng gói sách", "download epub", "tải sách", "send to kindle".
when_to_use: export epub, xuất sách, pack epub, đóng gói sách, download epub, tải sách, send to kindle, bilingual export, generate epub file
effort: medium
argument-hint: book ID
---

# EPUB Export — Pack & Download

Pack translated books back into EPUB format for reading or distribution.

> **Trước khi xuất**: Chạy `aio-epub-quality` để kiểm tra chất lượng. Chapters chưa dịch xong? Dùng `aio-epub-translate`.

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

### 1. Check Translation Status First

```python
progress = api("GetTranslationProgress", {"bookId": BOOK_ID})
pct = progress["progress"]["translationPercentage"]
print(f"Translation progress: {pct:.1f}%")

if pct < 100:
    untranslated = []
    for fp in progress["progress"].get("fileProgress", []):
        if fp["translationPercentage"] < 100:
            untranslated.append(f"  {fp['filePath']}: {fp['translationPercentage']:.0f}%")
    print(f"\nWarning: {len(untranslated)} chapters incomplete:")
    print("\n".join(untranslated))
```

### 2. Pack EPUB

```python
# Bilingual (original + translation side by side)
result = api("PackEpub", {
    "bookId": BOOK_ID,
    "packMode": "BILINGUAL"
})
print(f"EPUB URL: {result['epubUrl']}")
print(f"Message: {result['message']}")

# Translation only (remove original text)
result = api("PackEpub", {
    "bookId": BOOK_ID,
    "packMode": "TRANSLATION_ONLY",
    "stripMarkers": True  # remove data-* attributes for clean output
})
print(f"EPUB URL: {result['epubUrl']}")
```

### 3. Send to Kindle

```python
result = api("SendToKindle", {
    "bookId": BOOK_ID,
    "name": "My Book",
    "email": "your-kindle@kindle.com"
})
print(result["message"])
```

## Pack Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| `BILINGUAL` | Original + translation paragraphs | Learning, reference |
| `TRANSLATION_ONLY` | Only translated text | Reading, distribution |

### Strip Markers Option

When `stripMarkers: true` with `TRANSLATION_ONLY` mode:
- Removes all `data-content-id`, `data-translation-id`, `data-translation-by-id` attributes
- Produces clean HTML suitable for publishing
- Recommended for final export

## Điều hướng

| Tình huống | Dùng skill |
|-----------|------------|
| Có chapters chưa dịch | `aio-epub-translate` |
| Muốn kiểm tra chất lượng trước khi xuất | `aio-epub-quality` |
| Xem tiến độ tổng thể | `aio-epub-manage` |
| Upload sách mới | `aio-epub-upload` |

**Workflow**: `aio-epub-setup` → `aio-epub-upload` → `aio-epub-translate` → `aio-epub-quality` → **`aio-epub-export`**
