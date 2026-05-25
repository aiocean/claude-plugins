---
title: "CLAUDE.md là project memory, không phải documentation"
description: "Claude Code load CLAUDE.md vào session prompt mỗi lần khởi động. Điều đó khiến nó là prompt content, không phải documentation. Các loại nội dung xứng đáng một dòng, heuristic format giúp rule fire đáng tin cậy, kèm trang đồng hành link đến một ví dụ thực tế."
document_type: "guide"
created: "2026-05-25"
updated: "2026-05-25"
weight: 10
tags: ["claude-md", "project-memory", "claude-code", "best-practices", "configuration"]
---

# CLAUDE.md là project memory, không phải documentation

Claude Code tìm `CLAUDE.md` ở ba nơi khi một session khởi động: thư mục
home của user (`~/.claude/CLAUDE.md`), root của project, và thư mục con
đang làm việc. Bất kể tìm thấy gì, nó đều được nối vào session prompt
trước tin nhắn đầu tiên của user.

Đó là điểm phân biệt nó với `README.md`. README là documentation viết
cho con người đọc — họ có thể scroll, lướt, đọc lại. `CLAUDE.md` là
**prompt content**: mỗi dòng nằm trong context suốt session và cạnh
tranh với task thật của user để giành sự chú ý của model. Một file ngắn,
dày đặc thì được đọc. File dài thì bị lướt.

Vậy nên câu hỏi thật ra không phải *"tôi nên kể gì cho Claude về project
này?"* — con đường đó dẫn đến một CLAUDE.md to bằng cả wiki. Câu hỏi là
*"tập hợp dòng nhỏ nhất nào thay đổi behavior của model theo hướng mà
project của tôi thực sự cần?"*

Guide này nói về cách suy nghĩ về câu hỏi đó. Nó không quy định bản thân
các rule — điều đó phụ thuộc vào team của bạn, codebase của bạn, và
những gì bạn quan tâm. Nó mô tả *hình dạng* của nội dung fire đáng tin
cậy, và các kiểu thất bại tạo ra những file CLAUDE.md không ai được lợi.
Một ví dụ thực tế đầy đủ nằm ở trang đồng hành:
[**CLAUDE.md của tôi**](/vi/guides/my-claude).

## Cái gì xứng đáng một dòng

Ba loại nội dung rộng xứng đáng có chỗ trong CLAUDE.md. Tỉ lệ pha trộn
thay đổi theo project — phần lớn file nghiêng nặng về một hoặc hai loại.

### 1. Sự thật mà model không thể suy ra từ code

Trường hợp kinh điển. Convention, tool preference, và invariant không
xuất hiện trong source code.

- **Tool preference** — package manager nào, test runner nào, formatter
  nào. Codebase không nói *"never use yarn"*; CLAUDE.md thì có.
- **Process convention** — phong cách commit message, naming branch,
  khi nào hỏi trước khi push.
- **Invariant ẩn kèm rationale** — một con số magic kèm lý do (*"số lần
  retry là 5 vì upstream API tự retry trên timeout 4s"*), một ràng buộc
  thứ tự không được enforce bởi type, một workaround mà context chỉ tồn
  tại trong một thread slack.

Bài test thử: *nếu tôi xóa rule này, Claude có làm đúng một cách đáng
tin cậy không?* Nếu có, rule là nhiễu.

### 2. Default behavior bạn muốn sửa lại

Claude ship với default tune cho một audience rộng. Project của bạn có
thể muốn default khác. Các loại behavior mà team hay điều chỉnh nhất:

- Cách model cân bằng giữa **đồng tình vs. phản biện** với ý tưởng của user.
- Cách model xử lý **uncertainty** — đoán âm thầm vs. flag rõ hunch
  vs. từ chối claim cho đến khi verified.
- Mức độ aggressive khi model **root-cause** vs. patch triệu chứng.
- Cách model đối xử với **proxy** — *tests pass* có nghĩa là *feature
  works*, hay chỉ là *tests pass*?
- Cách model **ước lượng effort** — theo một con người duy nhất, hay
  theo những gì một AI session thực sự làm được.
- Mức độ **verbose** của end-of-turn summary, và phải bao gồm những gì.

Bạn không cần có quan điểm về mọi chiều. Chỉ ghi xuống những hiệu chỉnh
thực sự quan trọng cho project của bạn. Một team ship hạ tầng critical
muốn default khác với một team prototype UX. Mục đích của section này là
khai báo *nơi default của bạn khác với của model*, không phải đọc thuộc
mọi preference bạn có.

Hình dạng fire đáng tin cậy:

> *"By default, do X. Reason: Y."*

Một lý do làm rule bền vững qua các edge case. Một rule không có lý do
sẽ bị xóa lần đầu tiên nó gây cản đường.

### 3. Engineering principle bạn muốn giữ trong attention giữa task

Principle bạn muốn Claude áp dụng *trong khi viết code*, không chỉ tại
thời điểm review. Đây là những dòng có stake cao nhất trong file vì
chúng định hình mọi commit, nhưng cũng dễ over-include nhất — team nào
cũng có principle yêu thích, và phần lớn đã có trong training của model.

Một principle xứng đáng dòng của nó chỉ khi nó thay đổi output. Thường
là khi nó đi ngược với default mà model nếu không sẽ làm: ưu tiên code
co-located hơn là package hierarchy sâu, ưu tiên trả về error explicit
hơn là panic, ưu tiên duplication hơn là một abstraction lung lay. Nếu
principle là *"viết code tốt,"* bỏ đi.

## Cái gì sống ở chỗ khác

Bất cứ thứ gì Claude có thể extract on-demand đều thuộc về bên ngoài
CLAUDE.md:

- **File layout** — cây thư mục đã có sẵn.
- **Signature của function và API** — grep và đọc.
- **Lịch sử git gần đây** — `git log` là nguồn chính thức.
- **Practice lập trình tổng quát** — đã có trong trọng số của model.
- **State tạm thời** (sprint hiện tại, todo hôm nay, feature đang
  in-progress) — sống trong TodoWrite hoặc note per-task, không phải
  trong một file mà mỗi session load.

Khi nghi ngờ: *model có làm đúng việc này một cách đáng tin cậy mà không
cần rule không?* Nếu có, bỏ đi.

## Heuristic về format

### Imperatives over narration

*"Use X."* mạnh hơn *"We try to use X when appropriate."* Directive thẳng
fire như directive. Softener — *sometimes*, *generally*, *try to* — cho
model quyền bỏ qua rule khi cảm nhận có áp lực.

### Why before what, khi rule không hiển nhiên

*"Never use `--no-verify` on commits. Reason: a previous incident
bypassed a secret-scan hook and pushed a token to remote."*

Một rule mà rationale chỉ sống trong đầu ai đó thì chỉ cách một lần
re-org là biến mất. Người contributor tiếp theo đọc nó, không giải thích
được, và xóa nó.

### Group by concern

`## Code style`, `## Tools`, `## Workflow`, `## Behavior`. Một block cho
mỗi chủ đề để model có thể attend đến section liên quan khi concern đó
đang active. Danh sách phẳng dài với các rule pha trộn nhanh chóng mờ
trong attention.

### Một ví dụ cho mỗi rule kèm edge case

Một rule như *"prefer colocation"* không có ví dụ thì sụp đổ dưới sự
diễn giải. Một *"e.g. handler + query của nó trong một file, không tách
thành thư mục Services/"* cụ thể neo lại intent.

### Replace, không tích lũy

Khi bạn đổi ý về một rule, xóa hoàn toàn phiên bản cũ. Đừng để lại
residue như *"trước đây làm X, giờ làm Y"* trong các section
forward-looking của file. Phrasing cũ giữ approach đã loại bỏ trong
attention, và người contributor tiếp theo đọc nó như là context vẫn còn
relevant.

Rule phủ định chỉ thuộc về nơi chưa bao giờ có một phương án dương nào
(*"never commit secrets"*). Nếu bạn bị cám dỗ viết *"đừng dùng X cũ"*,
bước đi sạch sẽ hơn là viết *"dùng Y"* và để X cũ biến mất hoàn toàn
khỏi file.

Lịch sử sống trong `git log` hoặc một ADR. File rule hiện tại chỉ
forward-looking.

*(Ghi chú research: nhà tâm lý học gọi cái này là ironic-process effect —
*đừng nghĩ về X* vẫn kích hoạt X trong attention của reader. Cùng pattern
xuất hiện trong prompt.)*

### Khai báo cách uncertainty phải được diễn đạt

Default của model là prose tự tin đồng đều, khiến sự thật đã verify và
hunch chưa verify trông giống hệt nhau. Nếu bạn muốn phân biệt được, hãy
nói cách — explicit confidence label, prefix *"I'm guessing"*, một rule
cấm claim *"done"* mà không có bước verify. Cơ chế không quan trọng bằng
việc khai báo một cái.

## Độ dài và kỷ luật

Một CLAUDE.md ngắn được đọc với attention. File dài thì bị lướt. Điểm
giao nhau thay đổi, nhưng một file vượt vài trăm dòng gần như chắc chắn
đã vượt qua điểm đó.

Các hình dạng bloat phổ biến, và cách xử lý:

- **Domain expansion** — file tích lũy rule cho các phần không liên quan
  của codebase. Tách thành các file `CLAUDE.md` ở subdirectory, một cho
  mỗi vùng. Model load chúng dựa trên thư mục đang làm việc.
- **Documentation creep** — nội dung thực ra là documentation của sản
  phẩm hoặc onboarding. Chuyển vào `docs/`, `CONTRIBUTING.md`, hoặc một
  wiki.
- **Wishful rule** — những thứ không ai enforce. Hoặc bake vào CI (lint
  rule, pre-commit hook, GitHub Action) hoặc xóa. CLAUDE.md không phải
  là wish list.
- **Stale rule** — framework cũ đã biến mất nhưng rule của nó vẫn còn.
  Cắt tỉa.

Quỹ đạo dài hạn lành mạnh là *ngắn hơn theo thời gian*, không phải dài
hơn. Team học được rule nào model thực sự cần và rule nào là nhiễu;
nhiễu bị cắt.

## Một bộ khung khởi đầu

Nội dung cụ thể của project thay đổi, nhưng phần lớn các file hữu ích
chia sẻ một xương sống tương tự. Dùng cái này như điểm khởi đầu — thêm
các section bạn cần, xóa các section bạn không.

```markdown
# CLAUDE.md

## Tools and workflow

- [package manager / test runner / formatter của bạn]
- [điều kiện chạy command nào]
- [cái gì được coi là "sẵn sàng commit"]

## Code style

- [convention không được enforce bởi lint]
- [naming, file layout, vị trí test]
- [một hai ví dụ cho bất cứ thứ gì định hình genre]

## Behavior

- [preference giữa pushback và đồng tình]
- [cách uncertainty phải được flag]
- [cái gì được coi là "done" — kỳ vọng verification]

## Architecture invariants

- [những thứ trông như optional nhưng không phải]
- [tại sao mỗi invariant tồn tại]

## Commit and PR

- [phong cách commit message]
- [convention về size / scope của PR]
```

Một project nhỏ có thể chỉ cần hai section đầu. Một project lớn hơn có
thể tách `Architecture invariants` thành file per-subdirectory. Cấu trúc
là một khung khởi đầu, không phải mục tiêu.

## Iterate trên file

Đối xử với CLAUDE.md như code. Review nó trên PR. Hai kiểu thất bại cần
chú ý:

**Under-correction.** Cùng một hiệu chỉnh xuất hiện hai lần trong một
tuần. Thêm rule đó. Một dòng trong prompt tốn ít hơn các can thiệp lặp
lại.

**Over-accumulation.** Rule chất đống mà không fire trong nhiều tháng.
Bỏ chúng đi. Attention của model là hữu hạn; một rule không dùng tiêu
thụ attention mà các rule load-bearing cần.

Một CLAUDE.md trưởng thành ngắn hơn bản nháp đầu tiên, không phải dài
hơn. Các rule đã trở thành cơ bắp tự động được nâng cấp lên automation.
Các rule hóa ra là nhiễu bị cắt. Cái còn lại là tập nhỏ những thứ mà
model nếu không sẽ làm sai trên codebase này, diễn đạt ở dạng có khả
năng fire cao nhất.

## Một ví dụ thực tế

File `~/.claude/CLAUDE.md` của tác giả được publish như một trang đồng
hành: [**CLAUDE.md của tôi**](/vi/guides/my-claude). Nó là cấu hình đang
chạy của một team, không phải template — voice mang tính cá nhân (kèm
code-switching Việt–Anh), các rule cụ thể phản ánh project và tool của
tác giả này, và các lựa chọn sẽ không phải tất cả transfer được. Đọc nó
như một artifact: một instance cụ thể của các category mô tả ở trên,
được size và shape cho công việc thật của một engineer.

Vài thứ đáng để ý khi bạn đọc nó:

- **Chỗ nó khác với default của model.** Các section như *Proactive
  Conviction*, *Confidence Labels*, *Goal-Driven Execution*, và
  *Positive Framing* là những hiệu chỉnh explicit cho các behavior mà
  tác giả muốn khác với Claude out-of-the-box.
- **Cách mỗi rule mang theo lý do của nó.** Phần lớn rule không hiển
  nhiên đều có *"Reason:"* hoặc một citation research. Rule sống sót
  qua nhiều tháng dùng gần như luôn có một cái; rule không sống thì
  không.
- **Cái nó bỏ qua.** Không có cây file, không có danh sách API, không
  có lịch sử commit gần đây. Bất cứ thứ gì Claude có thể grep đều bị
  bỏ qua có chủ đích.
- **Hình dạng bloat vẫn còn ở đó.** Ngay cả file này cũng có những
  dòng tác giả có thể sẽ cắt ở lần đi tiếp theo. CLAUDE.md không bao
  giờ xong, chỉ là hiện tại đủ tốt.

→ Mở ví dụ: [**CLAUDE.md của tôi**](/vi/guides/my-claude)

## Liên quan

- [Catalog plugin](/vi/plugins) — `aio-claude-toolkit` bao gồm một skill
  audit file CLAUDE.md so với best practice.
- [Skill, agent, hook](/vi/guides/skills-agents-hooks) — ba primitive
  Claude Code lộ ra ngoài plain prompt.
- [Tài liệu chính thức của Anthropic về Claude Code](https://docs.anthropic.com/claude/docs/claude-code)
  để tham khảo chính thức về cách load file và precedence.
