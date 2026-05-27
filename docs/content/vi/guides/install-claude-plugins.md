---
title: "Cài Claude Code plugin chỉ với hai lệnh"
description: "Thêm marketplace aiocean vào Claude Code và cài plugin khi cần. Hai lệnh, chuyện gì xảy ra sau khi cài, và những lỗi hay gặp nhất khi dùng lần đầu."
document_type: "guide"
created: "2026-05-25"
updated: "2026-05-25"
weight: 0
tags: ["installation", "onboarding", "claude-code", "plugins", "getting-started"]
---

# Cài Claude Code plugin chỉ với hai lệnh

Một Claude Code plugin là một thư mục gồm skill, agent, hook và slash
command mà Claude cài theo từng project và chỉ load khi cần. Marketplace
này ship 28 plugin. Cài chỉ mất hai lệnh — một cho marketplace, một cho
từng plugin.

## Yêu cầu

Bạn cần cài [Claude Code](https://claude.com/claude-code). Hỗ trợ plugin
xuất hiện từ v2.0+; kiểm tra version của bạn bằng:

```sh
claude --version
```

Nếu bạn dưới 2.0, hãy upgrade trước khi tiếp tục. Các lệnh plugin không
tồn tại trên version cũ hơn.

## Bước 1 — thêm marketplace

Trong một session Claude Code bất kỳ, chạy:

```
/plugin marketplace add aiocean/claude-plugins
```

Lệnh này bảo Claude fetch chỉ mục plugin từ file
`.claude-plugin/marketplace.json` của repo này. Fetch chỉ diễn ra một lần
cho mỗi marketplace — những lần cài sau sẽ dùng chỉ mục đã cache.

Bạn có thể verify bằng:

```
/plugin marketplace list
```

`aiocean-plugins` phải xuất hiện trong output.

## Bước 2 — cài một plugin

Chọn một plugin từ [catalog](/vi/plugins) và cài theo tên:

```
/plugin install aio-epub-translate@aiocean-plugins
```

Hậu tố `@aiocean-plugins` giúp phân biệt plugin đến từ marketplace nào —
hữu ích khi bạn có nhiều marketplace cùng cài và xảy ra xung đột tên. Khi
chỉ có duy nhất marketplace này, hậu tố là tùy chọn nhưng nên ghi rõ cho
an toàn.

Sau khi cài, Claude download file của plugin vào cache plugin local, index
toàn bộ skill bên trong, đăng ký hook, và lộ ra các command. Không cần
restart bất cứ thứ gì.

## Chuyện gì xảy ra tiếp theo

Plugin đã *được cài* nhưng hầu hết nội dung không kích hoạt cho đến khi
cần:

- **Skill auto-trigger** khi tin nhắn của bạn fuzzy-match description
  của skill. Ví dụ: cài `aio-debug` không tốn context lúc rảnh rỗi, nhưng
  lần sau bạn nói "test này đang fail", skill sẽ load workflow debug của
  nó vào session.
- **Hook fire** trên các tool call (`PreToolUse`, `PostToolUse`, v.v.)
  mà plugin khai báo. Chúng chạy âm thầm trong nền.
- **Command** xuất hiện dưới dạng autocomplete `/<command-name>`.
- **Agent** có thể spawn qua tool `Agent` khi Claude quyết định một agent
  phù hợp với task.

Manifest plugin tại `plugins/{name}/.claude-plugin/plugin.json` khai báo
plugin dùng bề mặt nào, nên cài một plugin "chỉ kiến thức" (chỉ có skill)
không tốn gì cho đến khi có một tin nhắn liên quan.

## Update và uninstall

```
/plugin update aio-epub-translate@aiocean-plugins
/plugin uninstall aio-epub-translate@aiocean-plugins
```

`update` fetch lại theo manifest mới nhất của marketplace. Mỗi plugin
tuân theo semantic versioning — patch cho fix, minor cho khả năng mới,
major cho thay đổi behavior phá vỡ tương thích. Major bump là loại có
thể đổi behavior của skill ngay dưới chân bạn.

## Lỗi hay gặp

**"Plugin not found"** — kiểm tra lại tên plugin có khớp với [catalog](/vi/plugins)
không. Tên phân biệt chữ hoa-thường và ngăn cách bằng dấu gạch. `aio_epub` ≠
`aio-epub-translate`.

**Chỉ mục marketplace cũ** — nếu một plugin mới được thêm vào và bạn không
thấy, refresh marketplace:

```
/plugin marketplace update aiocean-plugins
```

**Skill không trigger** — skill load dựa trên fuzzy-match với tin nhắn của
bạn, không phải khi cài plugin. Nếu skill tồn tại nhưng không fire, thì
description trong frontmatter `SKILL.md` không khớp với cách bạn diễn đạt.
Thử các keyword từ [trang plugin](/vi/plugins) — đó chính là trigger word.

**Permission prompt ở lần chạy đầu** — plugin có thể ship hook chạy shell
command hoặc sửa file. Claude sẽ hỏi trước mỗi hành động ở lần đầu tiên;
approve một lần và permission đó tồn tại trong suốt session. Để cấu hình
permanent permission, edit file `.claude/settings.json` trong project của
bạn.

## Bước tiếp theo

- Duyệt [plugin catalog](/vi/plugins) và cài một cái hợp với công việc hôm nay.
- Đọc về [cách viết CLAUDE.md](/vi/guides/writing-claude-md-files) — file
  per-project điều chỉnh behavior của Claude độc lập với plugin.
- Hiểu [sự khác biệt giữa skill / agent / hook](/vi/guides/skills-agents-hooks)
  để biết một plugin trong tương lai nên nhắm vào bề mặt nào.
