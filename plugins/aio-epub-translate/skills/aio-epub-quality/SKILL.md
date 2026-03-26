---
name: aio-epub-quality
description: |
  Check translation quality and find chapters that need re-translation.
  Triggers: "check quality", "kiểm tra chất lượng", "quality report",
  "báo cáo chất lượng", "find bad translations", "tìm bản dịch kém".
---

# EPUB Quality — Translation Quality Report

Check translation quality across a book or specific chapter to find issues.

> **Khi nào dùng**: Sau khi dịch xong bằng `aio-epub-translate`, chạy quality check trước khi xuất bằng `aio-epub-export`.

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

### 1. Run Quality Report

```python
# Check a specific chapter
report = api("GetTranslationQualityReport", {
    "bookId": BOOK_ID,
    "filePath": FILE_PATH  # leave empty to check entire book
})

print(f"Quality Score: {report['qualityScore']:.1f}%")
print(f"Total Items: {report['totalItems']}")
print(f"Issues Found: {report['issuesCount']}")

for issue in report.get("issues", []):
    print(f"\n  [{issue['issueType']}] {issue['contentId'][:12]}")
    print(f"  Detail: {issue['detail']}")
    if issue.get("originalText"):
        print(f"  Original: {issue['originalText'][:100]}")
    if issue.get("translatedText"):
        print(f"  Translated: {issue['translatedText'][:100]}")
```

### 2. Issue Types

| Type | Meaning | Action |
|------|---------|--------|
| `mixed_language` | >50% words still in English | Re-translate |
| `empty_translation` | Translation element is empty | Translate |
| `too_short` | Translation <30% of original length | Review & re-translate |
| `untranslated` | Translation identical to original | Re-translate |
| `missing_translation_element` | ID referenced but element missing | Re-mark or re-translate |

### 2b. Literary Quality Evaluation (Đánh giá văn học sâu)

> Dùng khi mechanical score cao (>90%) nhưng bản dịch "nghe như dịch máy" hoặc "đọc không tự nhiên".

**Nạp kiến thức đánh giá** — resolve path đến references của `aio-epub-vn-style`:

```bash
REFS=$(ls -d ~/.claude/plugins/cache/aiocean-plugins/aio-epub-translate/*/skills/aio-epub-vn-style/references 2>/dev/null | sort -V | tail -1)
echo "$REFS"
```

Dùng Read tool đọc `$REFS/quality-rubric.md` (khung đánh giá MQM/ATA) và `$REFS/common-errors.md` (6 loại lỗi phải tránh). Đọc thêm `$REFS/word-choice.md` nếu cần tra đại từ.

**Tiêu chí đánh giá** (MQM + Tín-Đạt-Nhã):

| Tiêu chí | Trọng số | Kiểm tra |
|---|---|---|
| Accuracy (Tín) | 35% | Đúng nghĩa, không thêm bớt |
| Fluency (Đạt) | 25% | Không calque, không bị động thừa, Topic-Comment |
| Style (Nhã) | 20% | Giọng văn tác giả, từ láy, nhịp điệu |
| Cultural fit | 12% | Thành ngữ, Hán-Việt/thuần Việt phù hợp |
| Consistency | 8% | Đại từ, thuật ngữ xuyên chương |

**Red flags — dấu hiệu chất lượng kém** (chi tiết trong `$REFS/quality-rubric.md`):

| Red Flag | Pattern | Mức |
|---|---|---|
| Calque thành ngữ | "phá băng", "con voi trong phòng" | Critical |
| Calque bị động | "bị [verb] bởi [agent]" | Major |
| Calque copula | "Nó là quan trọng để..." | Major |
| Đại từ không nhất quán | "anh/em" → "anh/cô" giữa cảnh | Major |
| Thiếu tiểu từ tình thái | Đối thoại không có nhé, nhỉ, ơi, mà | Minor–Major |
| Câu dài >30 từ không tách | Giữ nguyên cấu trúc Anh | Minor–Major |
| Danh từ hóa quá mức | Chuỗi "sự + verb" | Minor–Major |
| Cụm sáo rỗng dịch thuật | "Nói một cách khác", "Sự thật là..." | Minor |

### 3. Re-translate Bad Items

For chapters with issues, use `aio-epub-translate` to re-translate:

```python
# Get the problematic items
page = api("GetPageJson", {
    "bookId": BOOK_ID,
    "filePath": FILE_PATH,
    "size": 0,
    "offset": 0
})

# Filter only items with quality issues
issue_ids = {issue["contentId"] for issue in report.get("issues", [])}
bad_items = [item for item in page["contents"] if item["contentId"] in issue_ids]

# Re-translate and submit via batch
batch_items = []
for item in bad_items:
    translated = translate(item["contentText"])  # Claude re-translates
    batch_items.append({
        "contentId": item["contentId"],
        "translatedContent": translated,
        "targetLanguage": "Vietnamese"
    })

result = api("BatchCreateManualTranslation", {
    "bookId": BOOK_ID,
    "filePath": FILE_PATH,
    "items": batch_items
})
print(f"Re-translated: {result['createdCount']} items")
```

### 4. Full Book Scan

```python
# Scan entire book (no filePath = all chapters)
report = api("GetTranslationQualityReport", {
    "bookId": BOOK_ID,
    "filePath": ""
})

# Group issues by file
from collections import defaultdict
by_file = defaultdict(list)
for issue in report.get("issues", []):
    by_file[issue.get("filePath", "unknown")].append(issue)

for file_path, issues in sorted(by_file.items()):
    print(f"\n{file_path}: {len(issues)} issues")
    for issue in issues:
        print(f"  [{issue['issueType']}] {issue['detail'][:80]}")
```

## Quality Thresholds

| Score | Status | Action |
|-------|--------|--------|
| 95-100% | Excellent | No action needed |
| 80-94% | Good | Review flagged items |
| 60-79% | Fair | Re-translate flagged items |
| <60% | Poor | Re-translate entire chapter |

## Bước tiếp theo

| Bạn muốn... | Dùng skill |
|-------------|------------|
| Re-translate các items kém | `aio-epub-translate` |
| Reset chương và dịch lại từ đầu | `aio-epub-manage` (phần Reset Chapter) |
| Quality OK → xuất sách | `aio-epub-export` |
| Xem tiến độ tổng thể | `aio-epub-manage` |

**Workflow**: `aio-epub-setup` → `aio-epub-upload` → `aio-epub-translate` → **`aio-epub-quality`** → `aio-epub-export`
