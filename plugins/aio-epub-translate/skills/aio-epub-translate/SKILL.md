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

#### NỀN TẢNG

**Ba tiêu chuẩn — Tín · Đạt · Nhã** (Nghiêm Phục, 1898):
- **Tín** (faithfulness): Trung thành ý nghĩa, tinh thần nguyên tác
- **Đạt** (comprehensibility): Mạch lạc, dễ hiểu
- **Nhã** (elegance): Uyển chuyển, đẹp ngôn từ

**Nguyên tắc cốt lõi**: Dịch sense-by-sense (theo nghĩa), KHÔNG word-by-word. Mục tiêu: tạo văn bản đọc như được viết bằng tiếng Việt ngay từ đầu.

#### CẤU TRÚC CÂU

- Tách câu dài (>25 từ) thành 2-3 câu ngắn có nhịp
- Chuyển bị động sang chủ động ("bị" = tiêu cực, "được" = tích cực)
- Đặt bối cảnh trước, hành động sau (cấu trúc Đề-Thuyết)
- Tránh danh từ hóa quá mức

#### CHỌN TỪ

- Ưu tiên thuần Việt cho sách đời thường, Hán-Việt cho sách hàn lâm
- Dùng từ láy tăng sức gợi hình (se se lạnh, lững thững, lấp lánh)
- Khai thác thành ngữ Việt khi phù hợp
- Chọn động từ mạnh, cụ thể
- Xử lý đại từ nhân xưng nhất quán (tôi/anh/cô vs mình/cậu)

#### NHỊP ĐIỆU

- Nhịp chẵn 2/2, 2/4, 4/4 là nhịp tự nhiên tiếng Việt
- Cân đối giữa các vế
- Câu ngắn đột ngột tạo nhấn mạnh

#### GIỌNG VĂN

- Xác định giọng nguyên tác trước khi dịch
- Đối thoại phải khác trần thuật (ừ, ờ, à, nhé, nha...)
- Giữ phong cách tác giả, không san phẳng thành "giọng dịch"

#### LỖI PHẢI TRÁNH

- Câu cứng theo cấu trúc tiếng Anh
- Lạm dụng bị động
- Câu quá dài không tách nhịp
- Hán-Việt nặng nề khi thuần Việt tự nhiên hơn
- "Sáo rỗng dịch thuật" (Nói một cách khác → nói cách khác)
- Dịch word-by-word thành ngữ

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
