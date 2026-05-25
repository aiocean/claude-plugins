---
title: "aio-epub-translate"
description: "Dịch sách EPUB sang tiếng Việt văn học từ đầu đến cuối — upload, phân tích trước khi dịch, dịch theo chương với kiểm tra nhất quán, đánh giá chất lượng, và xuất sách song ngữ."
document_type: "plugin"
version: "4.0.0"
install: "/plugin install aio-epub-translate@aiocean-plugins"
skills_count: 9
---

> **Cài đặt:** `/plugin install aio-epub-translate@aiocean-plugins` · `v4.0.0`

# aio-epub-translate

**Dịch sách EPUB bằng AI cho Claude Code.**

Dịch trọn cuốn sách sang tiếng Việt chất lượng văn học, dùng Claude làm dịch giả. Upload EPUB, dịch từng chương với tính nhất quán xuyên chương, tự động phát hiện bản dịch kém, và xuất EPUB song ngữ hoặc chỉ tiếng Việt đã được trau chuốt.

## Vì sao chọn plugin này?

Machine translation truyền thống xử lý từng đoạn văn riêng lẻ. Plugin này coi dịch thuật là một **nghề thủ công văn học**:

- Claude đọc toàn bộ context của chương trước khi dịch
- **Glossary** các thuật ngữ lặp lại được trích xuất tự động từ các chương trước
- Bản dịch tuân theo framework **Tín-Đạt-Nhã** (trung thành, dễ hiểu, uyển chuyển)
- Batch API gửi tất cả bản dịch trong một request thay vì gửi từng cái
- Phát hiện chất lượng bắt được text trộn ngôn ngữ, bản dịch ngắn bất thường, và đoạn chưa dịch

## Cài đặt

```bash
# Thêm marketplace (một lần)
/plugin marketplace add aiocean/claude-plugins

# Cài plugin
/plugin install aio-epub-translate@aiocean-plugins
```

## Skills

Plugin gồm 6 skills tạo thành pipeline dịch thuật hoàn chỉnh. Mỗi skill tham chiếu chéo các skill khác, nên Claude luôn biết gợi ý bước tiếp theo.

```
aio-epub-setup → aio-epub-upload → aio-epub-translate → aio-epub-quality → aio-epub-export
                                          ↕
                                   aio-epub-manage
```

### aio-epub-setup

> "setup epub", "cai dat epub", "configure api key"

Setup lần đầu: đăng ký tài khoản tại [read.aiocean.io](https://read.aiocean.io), mua license, và cấu hình API key. Bao gồm verify kết nối và cấu hình model.

### aio-epub-upload

> "upload epub", "tai sach len", "prepare book"

Upload file EPUB lên server. Tự động unpack, làm sạch HTML, đánh dấu nội dung cần dịch, và tạo guideline dịch AI phù hợp với phong cách và thể loại của sách.

### aio-epub-translate

> "dich sach", "translate chapter", "dich tiep", "translate book"

Skill dịch thuật cốt lõi. Với mỗi chương:

1. **Lấy context xuyên chương** qua API `GetChapterContext` — tóm tắt chương trước, glossary thuật ngữ lặp lại, guideline cấp sách và cấp chương
2. **Load nội dung** qua `GetPageJson` — JSON có cấu trúc gồm text gốc và bản dịch hiện có
3. **Claude dịch** theo nguyên tắc dịch văn học Việt — cấu trúc Đề-Thuyết, chủ động, nhịp điệu cân đối, thành ngữ
4. **Submit batch** qua `BatchCreateManualTranslation` — tất cả bản dịch trong một API call

Nguyên tắc dịch tích hợp sẵn trong skill:

| Nguyên tắc | Nghĩa là gì |
|-----------|---------------|
| Tín (faithfulness) | Trung thành với nghĩa và tinh thần, không word-by-word |
| Đạt (comprehensibility) | Đọc tự nhiên, như viết bằng tiếng Việt |
| Nhã (elegance) | Văn xuôi đẹp, có nhịp điệu và cân đối |

### aio-epub-quality

> "check quality", "kiem tra chat luong", "find bad translations"

Chạy phân tích chất lượng tự động trên các bản dịch. Phát hiện:

| Vấn đề | Cách phát hiện |
|-------|-----------|
| Trộn ngôn ngữ | >50% từ vẫn ở tiếng Anh |
| Bản dịch rỗng | Element bản dịch tồn tại nhưng trống |
| Quá ngắn | Bản dịch <30% độ dài bản gốc |
| Chưa dịch | Bản dịch giống hệt bản gốc |
| Thiếu element | Translation ID được tham chiếu nhưng element không tìm thấy |

Trả về điểm chất lượng (0-100%) và có thể tự động dịch lại các item bị flag.

### aio-epub-manage

> "list books", "check progress", "update guideline", "book info"

Skill hub để quản lý sách:

- Liệt kê tất cả sách trên server
- Xem mục lục với file path
- Kiểm tra tiến độ dịch từng chương (với indicator hoàn thành)
- Xem, cập nhật, hoặc tạo guideline dịch bằng AI
- Reset chương để dịch lại
- Xóa sách

### aio-epub-export

> "export epub", "xuat sach", "pack epub", "send to kindle"

Xuất sách đã dịch theo hai format:

| Mode | Output |
|------|--------|
| Bilingual | Gốc + bản dịch song song (để học) |
| Translation only | Chỉ text tiếng Việt sạch (để đọc) |

Hỗ trợ gửi trực tiếp đến Kindle qua email.

## API

Plugin giao tiếp với translation server qua ConnectRPC (JSON over HTTP POST).

| Endpoint | Mục đích |
|----------|---------|
| `BatchCreateManualTranslation` | Submit nhiều bản dịch trong một request |
| `GetChapterContext` | Glossary xuyên chương, guideline, chương trước |
| `GetTranslationQualityReport` | Phân tích chất lượng tự động |
| `GetPageJson` / `GetTranslationProgress` | Lấy nội dung và theo dõi tiến độ |
| `PackEpub` / `SendToKindle` | Xuất và giao sách |

**Server**: https://read-api.aiocean.dev
**Web app**: https://read.aiocean.io

## Workflow ví dụ

```
Bạn: upload sách này [đính kèm file.epub]
     → aio-epub-upload xử lý upload, đánh dấu, tạo guideline

Bạn: dịch chương 3
     → aio-epub-translate lấy context, dịch, submit batch

Bạn: kiểm tra chất lượng toàn sách
     → aio-epub-quality quét tất cả chương, report vấn đề

Bạn: dịch lại các chỗ kém
     → aio-epub-translate dịch lại các item bị flag

Bạn: xuất ra epub chỉ tiếng Việt
     → aio-epub-export đóng gói EPUB sạch, cung cấp link download
```

## Yêu cầu

- Claude Code có hỗ trợ plugin
- License key từ [read.aiocean.io](https://read.aiocean.io)
- Environment variable `AIO_EPUB_API_KEY` được set với license key của bạn

## Skills (9)

- [**aio-epub-analyze**](/vi/plugins/aio-epub-translate/aio-epub-analyze) — Phân tích sách EPUB trước khi dịch — phân tích phong cách viết, nhân vật, tone, và xây dựng glossary trước khi dịch.
- [**aio-epub-export**](/vi/plugins/aio-epub-translate/aio-epub-export) — Đóng gói và xuất sách EPUB đã dịch ở dạng song ngữ hoặc chỉ bản dịch.
- [**aio-epub-manage**](/vi/plugins/aio-epub-translate/aio-epub-manage) — Duyệt sách, kiểm tra tiến độ dịch, quản lý guideline, xem TOC, fork sách, đăng lên cộng đồng, reset chương, và xem thống kê sử dụng.
- [**aio-epub-quality**](/vi/plugins/aio-epub-translate/aio-epub-quality) — Kiểm tra chất lượng bản dịch và tìm các chương cần dịch lại.
- [**aio-epub-review**](/vi/plugins/aio-epub-translate/aio-epub-review) — Đánh giá văn học sâu cho các chương EPUB đã dịch — đánh giá chất lượng dịch, fix vấn đề nhất quán, và kiểm tra mạch lạc xuyên chương.
- [**aio-epub-setup**](/vi/plugins/aio-epub-translate/aio-epub-setup) — Hướng dẫn setup dịch vụ dịch EPUB — đăng ký tài khoản, mua license, và cấu hình API key.
- [**aio-epub-translate**](/vi/plugins/aio-epub-translate/aio-epub-translate) — Dịch các chương sách EPUB với chất lượng tiếng Việt văn học qua ConnectRPC API.
- [**aio-epub-upload**](/vi/plugins/aio-epub-translate/aio-epub-upload) — Upload và chuẩn bị sách EPUB để dịch.
- [**aio-epub-vn-style**](/vi/plugins/aio-epub-translate/aio-epub-vn-style) — Cẩm nang phong cách dịch văn học tiếng Việt — chọn từ, nhịp câu, quy ước theo thể loại, và các pattern lỗi phổ biến trong dịch Anh-Việt tự nhiên.
