---
name: aio-epub-setup
description: Setup guide for EPUB translation service. Register account, purchase license, configure API key. Triggers: "setup epub", "cài đặt epub", "epub setup", "register account", "đăng ký tài khoản", "buy license", "mua license", "configure api key", "cấu hình api key".
when_to_use: setup epub, cài đặt epub, epub setup, register account, đăng ký tài khoản, buy license, mua license, configure api key, cấu hình api key, install epub service, get started epub
effort: low
---

# EPUB Setup — Account & License Configuration

Hướng dẫn đăng ký tài khoản, mua license, và cấu hình API key để sử dụng dịch vụ dịch EPUB.

## Tổng quan

Dịch vụ EPUB Translation gồm 2 phần:
- **Web app**: https://read.aiocean.io — giao diện đọc và dịch sách
- **API server**: https://read-api.aiocean.dev — ConnectRPC API cho AI agents

> **Prerequisite**: Đây là skill đầu tiên trong workflow. Sau khi setup xong, dùng `aio-epub-upload` để tải sách lên.

## Bước 1: Đăng ký tài khoản

1. Truy cập https://read.aiocean.io
2. Click **Sign In** ở góc trên phải
3. Đăng nhập bằng tài khoản Google hoặc email
4. Sau khi đăng nhập, bạn có thể duyệt sách cộng đồng và khám phá giao diện

> **Guest mode**: Bạn có thể khám phá toàn bộ tính năng mà chưa cần đăng nhập. Chỉ khi thực hiện hành động (dịch, upload, lưu) mới cần xác thực.

## Bước 2: Mua License

License cho phép bạn:
- Upload sách EPUB lên server
- Dịch sách bằng AI (sử dụng models trên server)
- Xuất sách đã dịch (bilingual hoặc translation-only)
- Sử dụng API cho AI agents

### Cách mua

1. Đăng nhập tại https://read.aiocean.io
2. Vào **Settings** → **License**
3. Chọn gói phù hợp và thanh toán
4. License key sẽ hiển thị trong Settings sau khi thanh toán

### Gói license

| Gói | Mô tả |
|-----|--------|
| **Free** | Đọc sách cộng đồng, xem demo |
| **Personal** | Upload sách, dịch bằng AI, xuất EPUB |
| **Pro** | Tất cả tính năng + API access cho agents |

## Bước 3: Cấu hình API Key

### Cho AI Agent (Claude Code)

Thêm API key vào environment variable hoặc trực tiếp trong code:

```bash
# Option 1: Environment variable (khuyến nghị)
export JREAD_API_KEY="your-license-key-here"

# Option 2: Thêm vào .env file của project
echo 'JREAD_API_KEY=your-license-key-here' >> .env
```

### Verify kết nối

```python
import json, urllib.request, os

BASE = "https://read-api.aiocean.dev/ListBooks.v1.BookService"
KEY = os.environ.get("JREAD_API_KEY", "")

if not KEY:
    print("ERROR: JREAD_API_KEY not set")
    print("Run: export JREAD_API_KEY='your-license-key'")
    exit(1)

def api(method, body):
    data = json.dumps(body).encode('utf-8')
    req = urllib.request.Request(f"{BASE}/{method}", data=data, headers={
        "Content-Type": "application/json",
        "X-License-Key": KEY
    })
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())

# Test: validate license
try:
    result = api("ValidateLicense", {"licenseKey": KEY})
    if result.get("valid"):
        print("License is valid!")
        print(f"Message: {result.get('message', '')}")
    else:
        print(f"License invalid: {result.get('message', 'Unknown error')}")
except Exception as e:
    print(f"Connection failed: {e}")
    print("Check your network and API key")
```

### Verify full access

```python
# List your books
try:
    books = api("ListBooks", {"pageSize": 10, "pageNumber": 1})
    book_list = books.get("books", [])
    print(f"You have {len(book_list)} books")
    for b in book_list:
        print(f"  - {b['title']} ({b['id'][:30]}...)")
except Exception as e:
    print(f"Failed to list books: {e}")

# Check quota
try:
    quota = api("GetQuotaStatus", {})
    print(f"Quota status: {json.dumps(quota, indent=2)}")
except:
    print("Quota check not available for this license tier")
```

## Bước 4: Cấu hình Model AI (tùy chọn)

Mặc định server sử dụng model tích hợp. Bạn có thể cấu hình model riêng:

### Xem models khả dụng

```python
models = api("GetModels", {})
for m in models.get("models", []):
    print(f"  {m['id']}: {m['name']} (${m.get('inputCostPerMillion', 0)}/M input)")
```

### Cấu hình OpenAI-compatible API key riêng

Nếu bạn muốn dùng API key riêng (OpenAI, Anthropic, DeepSeek...):

```python
api("SetOpenAIConfig", {
    "apiKey": "sk-your-api-key",
    "baseUrl": "https://api.openai.com/v1"  # hoặc endpoint khác
})
print("Custom API key configured!")
```

## Troubleshooting

| Lỗi | Nguyên nhân | Giải pháp |
|-----|-------------|-----------|
| `401 Unauthorized` | API key sai hoặc thiếu | Kiểm tra `JREAD_API_KEY` |
| `403 Forbidden` | License hết hạn hoặc không đủ quyền | Gia hạn license |
| `connection refused` | Server không phản hồi | Kiểm tra mạng, thử lại sau |
| `quota exceeded` | Hết quota tháng | Nâng cấp gói hoặc chờ đầu tháng |

## Bước tiếp theo

Setup xong → chọn skill phù hợp:

| Bạn muốn... | Dùng skill |
|-------------|------------|
| Tải sách EPUB lên server | `aio-epub-upload` |
| Xem danh sách sách đã có | `aio-epub-manage` |
| Bắt đầu dịch một chương | `aio-epub-translate` |
| Kiểm tra chất lượng bản dịch cũ | `aio-epub-quality` |
| Xuất sách đã dịch xong | `aio-epub-export` |

**Workflow đề xuất**: `aio-epub-setup` → `aio-epub-upload` → `aio-epub-translate` → `aio-epub-quality` → `aio-epub-export`
