---
title: "Viết CLAUDE.md: những section thực sự hữu ích"
description: "Claude Code load CLAUDE.md vào mọi session. Cái gì thuộc về trong đó — Commands, Architecture, Gotchas — kèm ví dụ cụ thể, quality rubric, so sánh các loại file, và phím tắt `#` để edit giữa session."
document_type: "guide"
created: "2026-05-25"
updated: "2026-05-25"
weight: 10
tags: ["claude-md", "project-memory", "claude-code", "best-practices", "configuration"]
---

# Viết CLAUDE.md: những section thực sự hữu ích

Claude Code load `CLAUDE.md` vào mọi session như prompt context. Một
file gọn, hữu ích thay đổi cách Claude làm việc trên code của bạn.
Một file phình to, generic thì lãng phí attention. Guide này nói về
các section thực dụng xứng đáng có chỗ, kèm ví dụ cụ thể.

## Bốn loại file

Claude auto-discover `CLAUDE.md` lúc khởi động session. Mỗi vị trí
phục vụ một mục đích khác nhau — nhầm lẫn giữa chúng là lỗi phổ biến
nhất.

| File | Vị trí | Mục đích | Trong git? |
|---|---|---|---|
| **Project root** | `./CLAUDE.md` | Build command, architecture, gotchas cho *codebase này* | Có — chia sẻ với team |
| **Local override** | `./.claude.local.md` | Cài đặt cá nhân theo từng project | Không — `.gitignore` |
| **Subdirectory** | `./<area>/CLAUDE.md` | Context của module / package trong monorepo | Thường có |
| **User-level** | `~/.claude/CLAUDE.md` | Preference xuyên project (voice, behavior, principle) | Không — cá nhân |

Phần lớn guide này nói về **project root** — file bạn commit vào repo.
Với loại user-level, nhảy xuống [ví dụ file user-level](/vi/guides/my-claude)
ở cuối trang.

## Cái gì thuộc về project CLAUDE.md

File project trả lời câu hỏi: *"Claude (hoặc contributor mới) cần biết
gì mà không hiển nhiên từ việc đọc code?"* Sáu section bao quát phần
lớn. Chỉ dùng những section thực sự xứng đáng có chỗ.

### Commands

Script copy-paste sẵn cho build, test, dev, lint. Section hữu ích nhất
— Claude sẽ tìm đến chúng mỗi session.

```sh
# install
bun install

# dev server (port 3000)
bun run dev

# tests (CI mode, no watch)
bun test --run

# CI chạy gì trước khi merge
bun run check
```

Command không chạy được còn tệ hơn command bị thiếu — chúng tích cực
gây hiểu lầm. Khi script thay đổi, file phải thay đổi theo.

### Architecture

Layout thư mục cộng với constraint mà Claude không thể suy ra từ `ls`.
Bỏ qua nếu project chỉ có 5 file. Bắt buộc nếu có 500.

```
src/
  api/        # ConnectRPC handler — mỏng, ủy quyền sang domain/
  domain/     # business logic, không I/O, không external deps
  storage/    # SQLite + S3 adapter
  cli/        # Cobra command, entry point ở cmd/
proto/        # service definition, generate bằng `bun run buf`
```

> Constraint: `domain/` không import gì từ `api/` hoặc `storage/`.

Dòng constraint mới là cái mang trọng số — cây thư mục thì Claude có
thể tự suy lại bất cứ lúc nào.

### Key files

Entry point và file config mà Claude nên biết trước khi tìm kiếm.

- `src/index.ts` — server entry, wire DI container
- `src/config.ts` — load và validate env var (Zod schema)
- `proto/*.proto` — service contract, regenerate sau khi edit bằng
  `bun run buf generate`
- `migrations/*.sql` — apply theo thứ tự filename khi startup

### Environment

Env var bắt buộc và bước setup không có trong README.

- Copy `.env.example` thành `.env`
- `DATABASE_URL` — Postgres connection string
- `STRIPE_KEY` — để trống cho local dev; CI set từ GH secrets
- `LOG_LEVEL` — `debug` ở local, `info` ở prod
- Clone mới đòi `bun run migrate` trước `bun run dev`

### Gotchas

Những thứ không hiển nhiên đã từng "cắn" người. Section trả lại vốn
nhanh nhất.

- Tailwind config chỉ pick up từ project root — file
  `tailwind.config.js` trong subdirectory bị bỏ qua âm thầm.
- Auth middleware cache JWT key trong memory 10 phút. Restart server
  sau khi rotate key; chỉ gửi SIGHUP là chưa đủ.
- `bun test` mặc định chạy watch mode. Dùng `bun test --run` trong CI
  nếu không sẽ treo job.
- Migration file phải kết thúc bằng `.sql`, không phải `.psql` —
  migrator âm thầm bỏ qua extension khác.

Mỗi dòng nên trace ngược về một incident hoặc surprise thật. Nếu câu
trả lời cho *"làm sao mình biết cái này gây đau?"* là *"chưa, giả
thuyết thôi"*, hãy bỏ dòng đó.

### Workflow

Các bước Claude nên biết về dev loop của bạn.

- Trước commit: `bun run check` (lint + types + tests, ~30s)
- PR title: `feat(scope): summary` — enforce bởi commitlint
- Không `git push --force` vào `main`. Force-push lên feature branch OK.
- Release tag qua `bun run release` — bump version, generate changelog
  từ conventional commits.

## Quality rubric

Chấm điểm file bằng các check sau trước khi merge thay đổi vào nó.
Plugin `aio-claude-toolkit` ship một [skill audit file
CLAUDE.md](/vi/plugins/aio-claude-toolkit) theo đúng tiêu chí này một
cách tự động.

| Tiêu chí | Trọng số | Kiểm tra cái gì |
|---|---|---|
| Command chạy được | Cao | Mọi command tài liệu hóa đều chạy thành công hôm nay |
| Architecture cập nhật | Cao | Cây thư mục khớp với layout `src/` thực tế hôm nay |
| Gotchas xứng đáng | Trung | Mỗi cái trace về một incident hoặc surprise thật |
| Súc tích | Trung | Không nhắc lại cái code hoặc README đã nói |
| Up to date | Cao | Không tham chiếu file / dep / script đã bị xóa |
| Actionable | Cao | Command copy-paste sẵn, không `# điền X của bạn vào` |

Thang điểm:

- **A (90–100)** — toàn diện, cập nhật, actionable
- **B (70–89)** — coverage tốt, gap nhỏ
- **C (50–69)** — info cơ bản, thiếu section then chốt
- **D (30–49)** — sơ sài hoặc lỗi thời
- **F (0–29)** — thiếu hoặc lỗi thời nghiêm trọng

Một file đạt hạng A thường dài 50–150 dòng. Vượt 300 dòng thường có
nghĩa file đang bị dùng như documentation; chuyển nội dung vào
`docs/` hoặc tách thành các file subdirectory.

## Quy tắc format

Áp dụng cho cả bốn loại file.

### Imperatives over narration

*"Use bun, not npm."* mạnh hơn *"Chúng tôi thường ưu tiên bun khi phù
hợp."* Cách diễn đạt mềm — *sometimes*, *generally*, *try to* — cho
model quyền bỏ qua rule khi cảm nhận có áp lực.

### Why before what, khi rule không hiển nhiên

> Không bao giờ dùng `--no-verify` trên commit.
> Reason: một incident trước đây đã bypass secret-scan hook và push
> token lên remote.

Rule mà rationale chỉ sống trong đầu ai đó thì chỉ cách một lần re-org
là biến mất bởi contributor tiếp theo.

### Replace, không tích lũy

Khi bạn đổi ý về một rule, xóa hoàn toàn phiên bản cũ. *"Trước đây
làm X, giờ làm Y"* giữ approach đã loại bỏ trong attention. Chỉ dùng
phrasing khẳng định — `git log` và ADR là nơi lịch sử sống.

Ngoại lệ: rule mà phương án phủ định chưa bao giờ có alternative dương
(*"never commit secrets"*) có thể giữ ở dạng cấm.

### Một ví dụ cho mỗi rule không hiển nhiên

Rule như *"prefer colocation"* không có ví dụ sẽ sụp đổ dưới sự diễn
giải. Một *"e.g. handler + query của nó trong cùng một file, không
tách vào thư mục `Services/`"* cụ thể neo lại intent.

## Mẹo hữu ích

**Bấm `#` giữa session.** Trong một session Claude, bấm `#` và Claude
ghi learning hiện tại trực tiếp vào `CLAUDE.md`. Cách nhanh nhất để
capture gotcha khi bạn vừa phát hiện ra.

**Dùng `.claude.local.md` cho preference cá nhân.** Bất cứ thứ gì bạn
không muốn push lên team — layout tmux, connection string DB local,
*"giải thích ở mức X cho tôi"* — vào `.claude.local.md`. Thêm nó vào
`.gitignore`.

**Subdirectory file cho monorepo.** Mỗi package có `CLAUDE.md` riêng
với command và convention đặc thù của package. File root chứa cái
chia sẻ.

**Audit mỗi PR động vào file.** Đối xử với `CLAUDE.md` như code.
Command lỗi thời và architecture cũ là bug — chúng gây hiểu lầm cho
Claude mỗi session cho đến khi được sửa.

## Lỗi phổ biến cần chú ý

Khi audit một file có sẵn, để ý:

- **Command lỗi thời** — script trong `package.json` không còn tồn tại
- **Architecture cũ** — cây thư mục không khớp với `ls src/`
- **Thiếu dependency** — tool bắt buộc (Bun, Docker, gcloud) không
  được nhắc trong setup
- **Rule mơ ước** — những thứ không ai enforce (*"luôn viết test"*)
  mà không có CI gate phía sau
- **Documentation creep** — nội dung sản phẩm hoặc onboarding thuộc
  về `docs/`, không phải trong mọi session prompt
- **Giải thích dài dòng** — một section 200 từ trong khi 30 từ là đủ

## Một template khởi đầu

Đổ cái này vào `./CLAUDE.md` của một project mới, sau đó cắt và mở rộng.

````markdown
# CLAUDE.md

## Commands

```sh
bun install
bun run dev
bun test --run
bun run check
```

## Architecture

```
src/
  ...
```

## Key files

- `src/index.ts` — entry point
- ...

## Environment

Copy `.env.example` thành `.env`. Env var cần: ...

## Gotchas

- ...

## Workflow

- Trước commit: `bun run check`
- PR convention: ...
````

Một library nhỏ có thể chỉ cần Commands và Gotchas. Một app phức tạp
tách Architecture thành các file per-subdirectory. Template là điểm
khởi đầu, không phải mục tiêu.

## Một ví dụ thực tế (user-level)

Trang đồng hành [**CLAUDE.md của tôi**](/vi/guides/my-claude) tái hiện
file `~/.claude/CLAUDE.md` của tác giả — một file **user-level** áp
dụng cho mọi project trên máy. Nó nặng về philosophy và behavior
correction, không phải command.

File project-level trông không giống cái đó. Đọc ví dụ như một instance
của loại user-level trong bảng [bốn loại file](#bốn-loại-file), không
phải template cho file project-root mà guide này chủ yếu nói về.

## Liên quan

- [**CLAUDE.md của tôi**](/vi/guides/my-claude) — ví dụ user-level của
  tác giả
- [Catalog plugin](/vi/plugins) — `aio-claude-toolkit` bao gồm skill
  audit CLAUDE.md
- [Skills, agents, hooks](/vi/guides/skills-agents-hooks) — ba primitive
  Claude Code lộ ra
- [Tài liệu Anthropic Claude Code](https://docs.anthropic.com/claude/docs/claude-code)
  để tham khảo chính thức về cách load file và precedence
