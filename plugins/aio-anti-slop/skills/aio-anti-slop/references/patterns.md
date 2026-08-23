# Pattern catalog

Run the `rg` commands against the target file(s). Every match is a lead — confirm the defect in context before editing (SKILL.md step 3). Patterns marked *(by hand)* have no reliable regex; check them while reading.

## English prose

| # | Tell | Detect | Fix |
|---|------|--------|-----|
| E1 | Negative parallelism | `rg -in "not just|isn't just|not only|more than just|isn't about"` | Decide what the sentence asserts. Strawman → assert Y directly. Real contrast → name who actually holds X. Empty decoration → delete the sentence (most cases). |
| E2 | Paired em-dash aside | `rg -n "—[^—]{3,120}—"` (longer asides exist — also check any line with two dashes by hand) | Fold the aside into the sentence, or end the sentence. Single em dashes: apply the budget (≤1/150 words). |
| E3 | AI vocabulary | `rg -in "\b(delve|tapestry|testament|underscore(s|d)?|pivotal|crucial|vibrant|landscape|foster(ing)?|leverage|seamless(ly)?|holistic|robust|boast(s|ing)?|stands as|serves as)\b"` | Plain word: "use", "is", "has", "shows". Protected when it is precise domain language ("robust regression" in statistics). |
| E4 | Vague attribution | `rg -in "(experts|studies|research|critics|many) (believe|show|suggest|argue|say)"` | Name the source or cut the claim. If the author must supply it: `[ADD: which study?]`. Never invent one. |
| E5 | Throat-clearing | `rg -in "it('s| is) (important|worth) (to note|noting)|in today's|in an era|in a world"` | Delete the frame, keep the content. |
| E6 | Chatbot residue | `rg -in "i hope this helps|let me know if|great question|certainly!|of course!"` | Delete. |
| E7 | Formulaic closer | `rg -in "^(in conclusion|overall|ultimately),|the future (looks|is)"` | End on the last concrete point. A closer that turns the point into an aphorism or mic-drop gets cut, not rewritten into a better aphorism. |
| E8 | Rule of three *(by hand)* | Triads everywhere: "fast, simple, and reliable"; three examples, three clauses, three bullets. | Use the natural number. One strong item beats a padded triad. A single intentional tricolon is fine; three per page is a tell. |
| E9 | Uniform rhythm *(by hand)* | Three consecutive sentences of similar length; every paragraph within ~15% of the same word count. | Break one sentence, merge two others. |
| E10 | Bold-label showcase list *(by hand)* | `**Label:** restatement of the label` bullets; every proper noun bolded; decorative emoji in headings. | Convert to prose, or keep the bullet and make the text after the label say something new. |
| E11 | Portability filler *(by hand)* | The sentence could move unchanged to another product, company, or country. | Replace with the mechanism, the number, or nothing. |

**Banned escape hatches** — these are E1 in a wig and count as new findings: "less about X than Y" · "X matters, but Y matters more" · "the real X is Y" · "the question isn't X, it's Y" · "X? Y." · "— not X, but Y".

## Vietnamese prose

Tell cấu trúc giữ nguyên qua ngôn ngữ; đây là dạng tiếng Việt của chúng:

| # | Tell | Detect | Fix |
|---|------|--------|-----|
| V1 | "không chỉ X mà còn Y" | `rg -in "không chỉ.*mà còn|không đơn thuần"` | Khẳng định thẳng Y (cùng cây quyết định với E1). |
| V2 | Puffery | `rg -in "đóng vai trò (quan trọng|then chốt)|nâng tầm|đột phá|toàn diện|vượt trội|tối ưu hóa|mạnh mẽ"` | Nói điều đã xảy ra, kèm số liệu nếu có. |
| V3 | Khung sáo rỗng | `rg -in "trong bối cảnh|trong thời đại|điều đáng chú ý là|cần lưu ý rằng|hãy cùng (tìm hiểu|khám phá)"` | Xoá khung, giữ nội dung. |
| V4 | Trạng ngữ độn | `rg -in "một cách (hiệu quả|đáng kể|toàn diện|dễ dàng|nhanh chóng)"` | Động từ mạnh hơn hoặc con số đo được. |
| V5 | Kết bài công thức | `rg -in "^(tóm lại|nhìn chung|có thể nói),"` | Kết ở điểm cụ thể cuối cùng. |
| V6 | Bộ ba / nhịp đều | *(by hand — như E8, E9)* | Dùng số lượng tự nhiên; đảo nhịp câu. |

## Code (diff-scoped)

| # | Tell | Detect | Fix |
|---|------|--------|-----|
| C1 | Narrating comment | `rg -n "// (Get|Set|Check|Create|Initialize|Loop|Return|Call|Define|Import) "` and any comment restating the line below it | Delete. Keep only comments stating what the code cannot: constraints, invariants, non-obvious why. |
| C2 | Defensive overdose | try/catch or null-checks on trusted internal paths; `rg -n "catch.*\{\s*(console\.|// ignore|\})"` for swallowed errors | Remove checks the type system or the caller contract already guarantees. Keep real defenses: timeouts, retries, rate limits on external calls. |
| C3 | Type bypass | `rg -n "as any|@ts-ignore|# type: ignore|\bany\b"` | Fix the type, or document why the cast is sound. |
| C4 | Generic naming | `rg -n "\b(handle|process|manage)(Data|Info|Item|Event)s?\b|\b(result|temp|data)\d?\b ="` | Name after the domain action, not the mechanics. |
| C5 | Needless abstraction *(by hand)* | Helper with one caller, interface with one implementation, config for values that never vary | Inline it. Extract at the third occurrence. |
| C6 | Deep nesting *(by hand)* | Arrow-shaped code | Early returns. |
| C7 | Test slop *(by hand)* | Ask: would this test fail if the function broke? Mock-everything tests, assertion-free tests, tests of the mock | Test observable behavior, or delete the test. |

## Verification

Count hits before and after (`rg -c` per pattern). Report: fixed, intentionally kept (with reason), still failing. A clean scan is a proxy — reread the result once as a reader before calling it done.
