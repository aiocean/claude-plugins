---
title: "Ba primitive của Claude Code, ba công việc khác nhau"
description: "Skill, agent, hook — ba primitive plugin mà Claude Code lộ ra. Mỗi cái ánh xạ tới một cơ chế runtime khác nhau. Một cây quyết định để chọn giữa chúng, kèm ví dụ thực tế từ marketplace aiocean."
document_type: "guide"
created: "2026-05-25"
updated: "2026-05-25"
weight: 20
tags: ["skills", "agents", "hooks", "claude-code", "architecture", "plugin-development"]
---

# Ba primitive của Claude Code, ba công việc khác nhau

Một Claude Code plugin có thể ship ba kiểu mở rộng. Chúng ánh xạ tới ba
cơ chế khác nhau trong runtime của Claude Code:

- **Skill** — một file Markdown có frontmatter (`name`, `description`,
  `when_to_use` tùy chọn). Claude load phần body vào context của session
  khi tin nhắn của user fuzzy-match với description.
- **Agent** — một lời gọi Claude riêng biệt với context window và budget
  tool riêng. Được spawn khi Claude gọi tool `Agent` với `subagent_type`
  khớp. Trả về một chuỗi kết quả duy nhất cho parent.
- **Hook** — một shell command mà Claude Code chạy trên một lifecycle
  event (`PreToolUse`, `PostToolUse`, `Stop`, `UserPromptSubmit`, v.v.).
  Có thể inspect hoặc block event trước khi nó tiến hành.

Các primitive không thay thế lẫn nhau. Mỗi cái đánh đổi khác nhau về
context cost, mức độ isolation, và chỗ nào trong lifecycle session mà nó
chạy. Phần còn lại của trang này là cây quyết định.

## Tóm tắt một dòng

| Primitive | Làm gì | Khi nào kích hoạt |
|---|---|---|
| Skill | Load kiến thức quy trình vào context hiện tại | Khi nội dung tin nhắn match (fuzzy) |
| Agent | Chạy việc trong một context window cô lập | Khi Claude gọi tool `Agent` |
| Hook | Inspect hoặc thay đổi tool call / lifecycle event | Trên event đã đăng ký |

## Cây quyết định

Hỏi ba câu, theo thứ tự:

**1. Tôi có đang dạy Claude cách làm một việc gì đó không?**

Nếu bạn đang đưa cho Claude một quy trình ("khi review code Go, chạy các
linter này theo thứ tự"), một recipe ("đây là prompt chính xác cho ra bản
dịch văn học chất lượng"), hoặc kiến thức domain ("đây là ý nghĩa của
từng operator EXPLAIN trong StarRocks"), câu trả lời là **skill**. Skill
rất rẻ — load on-demand, ngủ yên khi không dùng.

**2. Tôi có đang parallel hóa hay cô lập công việc không?**

Nếu một task đơn lẻ cần một context window mới — fan-out research, điều
tra dài có thể làm phình thread chính, refactor nhiều file trong cô lập,
review code mà không nên làm bẩn context của người implement — điều đó
chỉ về phía **agent**. Agent trả một summary duy nhất cho parent; chúng
không dành cho "làm X lặp lại", mà cho "làm X *riêng biệt*."

**3. Tôi có đang phản ứng với một tool call không?**

Nếu bạn muốn validate, log, modify, hoặc block một tool invocation, bạn
cần **hook**. PreToolUse hook fire trước khi tool chạy (tốt cho validate
input hoặc block command nguy hiểm), PostToolUse hook fire sau khi tool
chạy (tốt cho action phái sinh, formatter). Hook nhìn thấy tên tool và
args; chúng có thể modify hoặc reject.

Nếu không cái nào trong ba cái phù hợp, câu trả lời đúng có thể không
phải là plugin. Một rule ngắn trong CLAUDE.md hoặc một custom command
tập trung thường giải quyết được cùng vấn đề với ít cơ sở hạ tầng hơn.

## Ví dụ thực tế từ marketplace này

**Skill**: [`aio-claude-toolkit/aio-patch-claude`](/vi/plugins/aio-claude-toolkit/aio-patch-claude).
Encode quy trình patch system prompt của Claude Code để loại bỏ bias
brevity. Auto-trigger trên các cụm như "patch claude" hoặc "unbloat
prompts." Kiến thức quy trình thuần túy, không công việc — skill là hình
dạng đúng.

**Skill**: [`aio-design-system/aio-uiux`](/vi/plugins/aio-design-system/aio-uiux).
Một catalog tham khảo 15 phần về visual design, typography, color, và
accessibility. Trigger trên các tin nhắn liên quan UI/UX.

**Agent**: các task như "review PR này độc lập" hoặc "chạy một chu kỳ TDD
trên feature này." Được handle bởi tool `Agent` built-in của Claude cộng
với một definition agent chuyên biệt. Một vài plugin ship custom agent
(`oh-my-claudecode:executor`, `oh-my-claudecode:code-reviewer`) đúng cho
các nhu cầu cô lập này.

**Hook**: một `PreToolUse` hook trên `Bash` chặn các pattern `rm -rf /`
hoặc `:(){:|:&};:`. Chạy âm thầm, không thêm slash command. Plugin
[aio-claude-toolkit](/vi/plugins/aio-claude-toolkit) ship một vài hook
mức session cho loại guardrail kiểu này.

## Kết hợp chúng

Ba primitive compose tốt với nhau khi mỗi cái đảm nhận đúng việc của mình:

1. Một **skill** trigger trên yêu cầu của user ("review code Go của tôi
   để tìm bug concurrency") và bảo Claude làm theo quy trình nào.
2. Claude spawn một **agent** với prompt chuyên biệt để phân tích phát
   hiện race condition, cô lập cuộc điều tra dài khỏi thread chính.
3. Một **hook** trên `PostToolUse` cho tool `Bash` capture stderr của
   lệnh test và surface lại cho Claude.

Skill mang *what*. Agent làm công việc trong cô lập. Hook phản ứng với
event mà công việc tạo ra. Đừng cố gộp hai vai trò vào một primitive.

## Anti-pattern

**Skill thực ra là documentation.** Nếu "skill" của bạn là một bài luận
2000 từ không có quy trình và không có cụm trigger, thì đó là bài wiki,
không phải skill. Skill phải *gọi được* — các bước rõ ràng tạo ra một
outcome.

**Agent cho việc lookup tầm thường.** Nếu bạn đang spawn một agent
`general-purpose` để đọc một file và báo cáo lại, bạn đã đốt token
overhead không vì gì cả. Cứ đọc file trong thread chính.

**Hook dùng như control flow.** Hook mang tính phản ứng — chúng fire
trên một event, chúng không cấu trúc workflow. Nếu một hook chặn 30% các
bash call để "ép một pattern tốt hơn", cách sửa đúng nằm upstream: một
skill dạy pattern đó hoặc một rule trong CLAUDE.md cấm phương án thay
thế. Một rule mà user đọc được luôn tốt hơn một silent block mà họ phải
debug.

**Plugin không có primitive.** Đôi khi câu trả lời đúng là thêm một đoạn
ngắn vào `CLAUDE.md` của project. Plugin nặng hơn — chúng cài xuyên suốt
mọi project của ai đó, ship version, và phải uninstall sau này. Nếu một
rule chỉ áp dụng cho project, hãy giữ nó ở mức project.

## Liên quan

- [Cài Claude Code plugin](/vi/guides/install-claude-plugins) — quy trình
  cài qua marketplace mà các primitive này ship qua.
- [Viết CLAUDE.md](/vi/guides/writing-claude-md-files) — cho các rule
  thuộc về project memory thay vì plugin.
- [Catalog plugin đầy đủ](/vi/plugins) — ví dụ cụ thể cho từng primitive
  trong thực tế.
