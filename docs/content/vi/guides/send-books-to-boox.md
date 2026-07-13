---
title: "Gửi sách lên máy BOOX ngay từ terminal"
description: "Cài plugin aio-boox: lấy token push.boox.com từ trình duyệt một lần, rồi đẩy EPUB/PDF lên máy đọc Onyx BOOX và đọc note của máy ngay trong Claude Code — không web UI, không email, không BooxDrop."
document_type: "guide"
created: "2026-07-13"
updated: "2026-07-13"
weight: 25
tags: ["aio-boox", "boox", "onyx", "e-reader", "epub", "push", "e-ink"]
---

# Gửi sách lên máy BOOX ngay từ terminal

Onyx cho bạn ba cách chính thức để đưa file vào máy đọc BOOX: web UI
push.boox.com, cầu nối email send2boox, và BooxDrop qua WiFi nội bộ. Cả ba
đều bắt bạn rời terminal.

Plugin [aio-boox](/vi/plugins/aio-boox) nói chuyện thẳng với API của BOOX
cloud — đúng quy trình ba bước mà web app thực hiện (upload lên storage,
ghi vào kênh sync của thiết bị, đánh thức thiết bị) — gói trong một CLI
Node duy nhất, không phụ thuộc gì. Cài xong, "đẩy epub này lên boox" là
câu bạn nói với Claude giữa phiên làm việc, và vài giây sau file nằm trong
Push List của máy.

Phần duy nhất hơi lích kích là setup một lần, và nó là một chuyến ghé
trình duyệt: API xác thực bằng chính token mà phiên đăng nhập trình duyệt
đang giữ, bạn cần copy nó ra một lần. Guide này đi qua bước đó, rồi đến
workflow hằng ngày, và cái bẫy giao file mà ai cũng dính một lần.

## Yêu cầu

- [Claude Code](https://claude.com/claude-code) đã thêm marketplace
  aiocean ([hai lệnh](/vi/guides/install-claude-plugins))
- Node.js 18+ (`node --version`) — CLI chỉ dùng built-in của Node
- Tài khoản BOOX mà thiết bị của bạn đang đăng nhập (kiểm tra trên máy
  trong **Settings → Accounts**)

Cài plugin:

```
/plugin install aio-boox@aiocean-plugins
```

## Bước 1 — đăng nhập trên trình duyệt và copy token

BOOX cloud không có trang API key, cũng không có OAuth cho bên thứ ba.
Web app xác thực mọi request bằng một JWT sống lâu nằm trong
`localStorage` — nên bạn đăng nhập một lần trên trình duyệt và copy token
đó ra.

1. Mở [push.boox.com](https://push.boox.com) và đăng nhập bằng **đúng tài
   khoản mà thiết bị đang dùng** (Google, email, hay số điện thoại — bạn
   dùng gì trên máy thì dùng đó).
2. Mở DevTools (`F12`, hoặc `Cmd`+`Option`+`I` trên macOS), vào tab
   **Console**.
3. Chạy:

   ```js
   copy(localStorage.token)
   ```

   Token đã nằm trong clipboard. (Không vào được Console? Tab
   **Application** → **Local Storage** → `https://push.boox.com` → copy
   giá trị của key `token`.)

4. Lưu vào chỗ CLI tìm được:

   ```sh
   mkdir -p ~/.config/boox
   pbpaste > ~/.config/boox/token        # macOS; Linux: xclip -o > ~/.config/boox/token
   ```

5. Trỏ plugin vào đó — thêm vào shell profile:

   ```sh
   export BOOX_TOKEN_FILE="$HOME/.config/boox/token"
   ```

   (Hoặc bỏ qua file mà `export BOOX_TOKEN="eyJ..."` trực tiếp — tác dụng
   y hệt, chỉ dễ lọt vào shell history hơn. Tùy bạn.)

Hãy coi token như mật khẩu: nó là toàn quyền truy cập BOOX cloud của bạn —
sách, note, push thiết bị. Đừng commit, đừng dán vào issue.

Token sống khoảng 6 tháng. Hết hạn thì CLI bắt đầu báo lỗi xác thực; cách
sửa vẫn là vòng lặp trình duyệt đó — đăng nhập, copy, ghi đè file.

**Tài khoản Trung Quốc đại lục**: cloud của bạn là một deployment khác.
Đăng nhập tại [send2boox.com](https://send2boox.com) thay vì push.boox.com,
và thêm `export BOOX_HOST=https://send2boox.com`.

## Bước 2 — kiểm tra nhanh

Trong một phiên Claude Code:

> boox của tôi có online không?

Claude chạy lệnh `whoami` và `device` của plugin, hiển thị tài khoản, dung
lượng, các thiết bị đã đăng ký và thời điểm đăng nhập gần nhất. `whoami`
trả về email của bạn nghĩa là xác thực đã chạy — setup xong.

## Bước 3 — đẩy một cuốn sách

> đẩy ~/Downloads/thinking-in-systems.epub lên boox

Bên dưới, CLI upload file lên cloud storage của BOOX, ghi nó vào kênh sync
của thiết bị, và bắn notification. Trên máy, file xuất hiện trong
**Apps → Transfer (互传) → Push List** và bắt đầu tải về.

Đẩy trùng tên file thì cloud tự đổi tên bản sau (`foo.epub` →
`foo(1).epub`), y như web app — không ghi đè.

## Cái bẫy duy nhất: thiết bị phải online *đúng lúc push*

Push là một cú đánh thức, không phải hòm thư. Nếu máy đang ngủ hoặc
offline lúc bạn gửi, file vẫn nằm đúng chỗ trong Push List trên cloud —
nhưng cú đánh thức không tới được máy, nên không có gì tải về. File cứ
nằm đó.

Hai điều cần biết:

- Cờ `online` của lệnh `device` không đáng tin. Nhìn `latestLoginTime`
  thay vào đó — nếu nó cũ vài tiếng, máy thực ra không kết nối, mặc cho
  cờ nói gì.
- **Đừng upload lại.** Đánh thức máy (mở app Transfer để nó kết nối lại),
  rồi bảo Claude *repush* — lệnh đó chỉ bắn lại notification cho file đã
  nằm sẵn trên cloud, và file rơi xuống máy ngay lập tức.

Nên flow thực tế là: cứ push bất cứ lúc nào, sách không hiện thì cầm máy
lên, mở Transfer, và nói "repush đi".

## Ngoài push: thư viện và note

Cùng token đó đọc được phần còn lại của BOOX cloud, nên bạn cũng có thể
nhờ Claude:

- **xem push list** — đã gửi gì, kèm dung lượng và ngày
- **xem sách** — thư viện trên cloud
- **lấy note** — sổ tay sync từ máy (chỉ đọc; tiêu đề và cấu trúc, không
  có nét viết tay)
- **xoá** file đã push, sách, hoặc note

Xoá được rào chắn có chủ đích, vì nó đụng vào tài khoản thật của bạn:

- Mọi lệnh xoá mặc định là **dry run** — in ra thứ sẽ bị xoá rồi dừng lại
  chờ bạn xác nhận.
- Xoá sách/note mặc định là **vĩnh viễn**; có cờ `--soft` để đưa vào thùng
  rác (khôi phục được). Riêng push list không có thùng rác.
- Item vừa xoá có thể còn hiện trong danh sách vài giây — sync trên cloud
  trễ hơn thao tác ghi một nhịp. Chạy lại lệnh list trước khi kết luận
  xoá thất bại.

## Xử lý sự cố

| Triệu chứng | Nguyên nhân | Cách sửa |
|---|---|---|
| Lỗi xác thực/401 ở mọi lệnh | Token hết hạn (~6 tháng) hoặc copy thiếu | Copy lại `localStorage.token` từ tab push.boox.com đang đăng nhập |
| `whoami` chạy nhưng thư viện hiện sai | Trình duyệt đăng nhập tài khoản BOOX khác với máy | Đăng nhập lại push.boox.com bằng tài khoản của máy, copy lại token |
| File push không bao giờ hiện trên máy | Máy offline lúc push | Đánh thức máy, mở app Transfer, nhờ Claude repush |
| Mọi thứ đều lỗi và tài khoản của bạn là Trung Quốc đại lục | Sai deployment | `export BOOX_HOST=https://send2boox.com` và lấy token từ send2boox.com |

## Dùng CLI không cần Claude

Cả plugin là một script tự chứa — `boox.mjs`, chỉ dùng built-in của Node.
Muốn chạy trong cron hay shell thường, lấy nó từ
[repo](https://github.com/aiocean/claude-plugins/tree/main/plugins/aio-boox)
và chạy trực tiếp:

```sh
node boox.mjs whoami
node boox.mjs send-book book.epub
node boox.mjs repush book
node boox.mjs list-push
```

Cùng token, cùng biến môi trường, không cần Claude.
