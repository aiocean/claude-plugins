---
name: aio-html-interactive
description: |
  Dựng nhanh một interactive web app dùng-một-lần (Vue 3 + Tailwind, no build) chạy local
  và nói chuyện realtime 2 chiều với AI qua WebSocket + Monitor tool. AI copy scaffold
  ra /tmp, viết app vào APP REGION, spawn bun server qua Monitor, tương tác với người
  dùng qua browser, rồi dọn sạch khi xong. Use when the user wants an ad-hoc visual
  interactive tool — a form, dashboard, picker, approval queue, wizard, viewer — driven
  by the AI in real time. Triggers: "/aio-html-interactive", "/interactive", "làm cái UI
  tương tác", "dựng app tương tác", "interactive tool", "throwaway UI", "one-off web app".
when_to_use: interactive web app, dựng UI tương tác, throwaway app, one-off UI, ad-hoc form, real-time browser, AI talk to browser, websocket UI, monitor + browser, picker UI, approval queue, wizard, dashboard tạm, Vue tailwind no build, send to browser, push state to browser
argument-hint: "[slug for /tmp dir, e.g. 'picker' or 'review-queue']"
effort: medium
---

# aio-html-interactive — interactive web app dùng-một-lần

Skill này dựng một web app **dùng-một-lần** chạy local để AI và người dùng nói chuyện realtime 2 chiều. Kiến trúc: AI copy scaffold ra `/tmp`, viết app vào **app region**, spawn một **bun server** qua **Monitor tool** → server tự mở browser. Chiều **browser → AI**: app `send()` POST lên `/api/event`, server in một dòng `MSG::` ra stdout, Monitor biến nó thành notification. Chiều **AI → browser**: AI `POST /api/push`, server broadcast qua **WebSocket** tới browser. UI là **Vue 3** (reactivity) + **Tailwind** (styling), cả hai vendored, không build step. App chết khi Monitor task dừng.

## Workflow

1. **Copy scaffold** — `cp -r ${CLAUDE_PLUGIN_ROOT}/skills/aio-html-interactive/scaffold /tmp/aio-html-interactive-<slug>` qua **Bash** (KHÔNG dùng Read+Write — copy bằng Read+Write là cách edit nhầm vào runtime frozen lọt vào).
2. **Build app** — `Read` file `/tmp/aio-html-interactive-<slug>/app.html` MỘT lần trước khi edit. Edit tool đòi một lần `Read` in-conversation; `cp` ở bước 1 KHÔNG tính, nên bỏ qua bước Read là Edit đầu tiên CHẮC CHẮN fail (`File has not been read yet`). Đọc vùng APP REGION là đủ — `Read` với `offset`/`limit` quanh hai marker (~25 dòng cuối file). Rồi edit DUY NHẤT phần text giữa `<!-- ===== APP REGION START ... -->` và `<!-- ===== APP REGION END ===== -->`, dùng **Edit tool** với hai dòng marker đó làm anchor. KHÔNG bao giờ rewrite cả file. KHÔNG đụng runtime block, `server.js`, hay `vendor/` — và KHÔNG cần `Read` chúng, toàn bộ API đã doc đầy đủ trong skill này.
3. **Launch** — chạy `bun /tmp/aio-html-interactive-<slug>/server.js` qua **Monitor tool**. Dòng khởi động cho URL + `instance` id; browser tự mở.
4. **Interact** — event từ browser tới dưới dạng notification của Monitor: `MSG::{instance,type,payload}`. AI đẩy ngược lại bằng `curl -s -X POST http://localhost:<PORT>/api/push -d '{"type":"...","payload":{...}}'`.
5. **Cleanup (bắt buộc)** — khi xong: `TaskStop` Monitor task VÀ `rm -rf /tmp/aio-html-interactive-<slug>`. Để lại là rác.

## Server API

- `POST /api/push` `{type,payload}` — AI → browser. Server broadcast verbatim qua WebSocket tới mọi browser.
- `POST /api/event` `{type,payload}` — browser → AI. App `send()` gọi cái này; server in `MSG::{instance,type,payload}` ra stdout.
- `MSG::` stdout line — JSON sau prefix có `instance` (id phân biệt nhiều app `aio-html-interactive` chạy song song), `type`, `payload`.

## Runtime API (browser)

- `RT.start(appDef)` — entry point DUY NHẤT app region gọi (gọi cuối, một lần). `appDef` là Vue component options: `template`, `setup`, ... Runtime inject `state`/`send`/`on` vào render scope; return values từ `setup()` của app merge lên trên.
- `RT.state` — reactive global state (`Vue.reactive`). App template đọc `state.*`.
- `RT.send(type, payload)` — gửi event lên AI (POST `/api/event`).
- `RT.on(type, fn)` — đăng ký handler cho một push `type` tùy biến (không phải built-in).
- **Template** đọc `state`, `send`, `on` trực tiếp (runtime trả chúng vào render scope). Trong **thân hàm `setup()`** thì KHÔNG — ở đó phải gọi `RT.state` / `RT.send` / `RT.on` (chúng là biến closure của runtime, không phải global của app region; viết `send(...)` trần trong `setup()` sẽ `ReferenceError`).

## Built-in push actions

`POST /api/push` với các `type` sau được runtime xử lý trực tiếp (trước app handler — app KHÔNG shadow được):

| `type` | `payload` | Tác dụng |
|---|---|---|
| `state` | object | **Shallow-merge** vào `RT.state` → Vue re-render. Cơ chế CHÍNH để đổi UI. |
| `state-set` | object | Xóa sạch state cũ rồi gán payload mới (full replace). |
| `toast` | `{kind,text}` | Toast — `kind`: `ok` (xanh, tự ẩn ~4s) / `err` (đỏ) / `held` (hổ phách) / `info` (xám). |
| `html` | `{target,mode,html}` | `querySelector(target)`; `mode:"append"` thì append, còn lại replace `innerHTML`. Target thiếu → toast `err`. |
| `js` | `{code}` | Eval chuỗi `code` (escape hatch). Lỗi → toast `err` (không bao giờ im lặng). |
| `reload` | — | `location.reload()`. |

`type` khác → gọi handler đăng ký qua `RT.on()`; không có handler → bỏ qua im lặng.

## Design principles for a good one-off app

- **Drive UI qua `state`** — push `state` patch, để Vue reactivity tự re-render. Đây là cơ chế chính, ưu tiên nó.
- **Bake initial state nếu đã biết sẵn** — khi AI đã cầm data ban đầu lúc viết app (danh sách, bảng, cấu hình…), seed thẳng vào `RT.state` ngay trong `setup()` để first paint hiện đầy đủ, không blank-flash. Chỉ dùng `push state` cho *update về sau*. Đừng launch server xong mới push state khởi tạo — đó là một round-trip thừa và user nhìn màn hình trống trong lúc chờ.
- **Mỗi `state` key chỉ MỘT writer** — hoặc app sửa local (optimistic), hoặc AI `push state`; đừng để cả hai cùng ghi một key. Cùng ghi → last-writer-wins race, giá trị nhảy loạn. Chọn một mô hình: *AI-authoritative* (click chỉ `send()`, chỉ AI push — không race, đổi lại có latency) hoặc *browser-authoritative* (app sửa local, AI chỉ đọc event, không push key đó).
- `html` / `js` chỉ là **escape hatch** — dùng khi `state` không đủ, không phải mặc định.
- Định nghĩa một **vocabulary message nhỏ, rõ** — vài `type` cho browser→AI, vài `type` cho AI→browser.
- **Gửi tường minh + trạng thái chờ** — AI trong vòng lặp là async, chạy theo lượt, có thể chậm vài giây; `send()` là fire-and-forget. ĐỪNG bắn `send()` ở mỗi micro-interaction (mỗi cú bấm) rồi để user mù — họ không biết AI đã nhận chưa, đang xử lý không, có được thao tác tiếp không. Thay vào đó: gom input vào `state` local, cho user một **nút "Gửi cho AI" tường minh** để chủ động chốt; khi đã gửi thì set một cờ pending (vd `state.busy = true`) để UI hiện "đang chờ AI…" và/hoặc disable input; AI xử lý xong push `state` clear cờ. Vòng phản hồi phải khép kín — user luôn biết đang tới lượt ai.
- Giữ app **focused vào đúng một việc** — đây là tool dùng-một-lần, không phải product.

## Starter — skeleton APP REGION (tùy chọn)

Khung dưới đây đã theo sẵn các design principle trên: header, container căn giữa, nút **"Gửi cho AI"** tường minh, cờ `state.busy`, và bake initial state trong `setup()`. Copy đè lên placeholder rồi thay phần nội dung. Đây chỉ là head-start — app cần layout khác thì cứ viết khác, KHÔNG bắt buộc dùng.

```html
RT.start({
  template: `
    <div class="min-h-screen pb-24">

      <!-- header — tên app + một dòng mô tả -->
      <div class="bg-slate-900 text-white">
        <div class="max-w-3xl mx-auto px-6 py-5">
          <h1 class="text-lg font-semibold">{{ state.title }}</h1>
          <p class="text-slate-400 text-sm mt-0.5">{{ state.subtitle }}</p>
        </div>
      </div>

      <!-- nội dung chính — thay khối này bằng app thật -->
      <div class="max-w-3xl mx-auto px-6 py-6">
        <div class="bg-white rounded-xl border border-slate-200 p-6 text-sm text-slate-600">
          Nội dung app ở đây.
        </div>
      </div>

      <!-- thanh hành động — nút Gửi tường minh, khoá khi đang chờ AI -->
      <div class="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200">
        <div class="max-w-3xl mx-auto px-6 py-3 flex items-center gap-4">
          <div class="flex-1 text-sm text-slate-500">
            {{ state.busy ? '⏳ Đang chờ AI…' : 'Sẵn sàng.' }}
          </div>
          <button @click="submit" :disabled="state.busy"
              class="px-5 py-2 rounded-lg text-sm font-semibold text-white
                     bg-slate-900 hover:bg-slate-700 disabled:opacity-40">
            Gửi cho AI →
          </button>
        </div>
      </div>

    </div>
  `,
  setup() {
    // Bake initial state — first paint hiện đầy đủ ngay, không blank-flash.
    RT.state.title = "Tên app";
    RT.state.subtitle = "Một dòng mô tả ngắn";
    RT.state.busy = false;

    // Browser → AI: chốt input rồi bật cờ busy để UI tự khoá.
    function submit() {
      if (RT.state.busy) return;
      RT.state.busy = true;
      RT.send("submit", {});
    }

    // AI → browser: xử lý xong, AI push {"type":"done"} để nhả cờ busy.
    RT.on("done", function () {
      RT.state.busy = false;
    });

    return { submit: submit };
  },
});
```

Localhost-only, session-scoped — app chết khi Monitor task spawn nó dừng.
