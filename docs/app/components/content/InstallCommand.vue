<script setup lang="ts">
// Install callout for plugin/skill pages — invoked via MDC slot syntax:
//
//   ::install-command
//   /plugin install aio-foo@aiocean-plugins
//   ::
//
// The command lives inside the default slot (not a prop) so plugin READMEs
// stay self-documenting on GitHub: a reader browsing the raw markdown sees
// the actual install command as plain text, not an opaque
// `cmd="…"` attribute. Sync no longer injects this block on plugin pages —
// each README owns its own install card.
//
// Skill pages still get the block injected by sync (SKILL.md files are
// authored by skill authors and aren't expected to know their parent
// plugin's slug); for those pages, `plugin` + `plugin-slug` props add the
// "From plugin <link>" affordance above the command row.
//
// Why DOM textContent for copy instead of parsing the slot VNode tree?
//   MDC wraps block-slot content in a `<p>`, and future MDC versions could
//   nest it differently. `textContent` on the rendered `<code>` element is
//   structure-agnostic — whatever shape MDC produces, the user sees one
//   string and copies that exact string. The ref-based approach also dodges
//   any need to enumerate Vue VNode children manually.
import { ref, onBeforeUnmount } from 'vue'

defineProps<{
  // Skill pages render "From plugin <link>" above the command; omitted on
  // plugin pages where the page IS the plugin and that context is redundant.
  plugin?: string
  pluginSlug?: string
}>()

type CopyState = 'idle' | 'copied' | 'error'
const state = ref<CopyState>('idle')
const codeEl = ref<HTMLElement | null>(null)

// Single shared timer so rapid re-clicks reset the "Copied" pill cleanly
// instead of stacking timeouts that fight each other.
let resetTimer: ReturnType<typeof setTimeout> | null = null

async function copy() {
  // textContent collapses MDC's wrapper structure into the literal command
  // string the user sees. trim() strips the trailing newline MDC adds after
  // the slot content.
  const cmd = codeEl.value?.textContent?.trim() ?? ''
  if (!cmd) {
    state.value = 'error'
    scheduleReset()
    return
  }

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(cmd)
    }
    else {
      // execCommand fallback for older browsers / non-secure contexts where
      // navigator.clipboard is undefined. Off-screen textarea is the
      // standard pattern; opacity:0 avoids visible flicker.
      const ta = document.createElement('textarea')
      ta.value = cmd
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      ta.style.pointerEvents = 'none'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    state.value = 'copied'
  }
  catch {
    state.value = 'error'
  }

  scheduleReset()
}

function scheduleReset() {
  if (resetTimer) clearTimeout(resetTimer)
  resetTimer = setTimeout(() => {
    state.value = 'idle'
    resetTimer = null
  }, 2000)
}

onBeforeUnmount(() => {
  if (resetTimer) clearTimeout(resetTimer)
})
</script>

<template>
  <div class="install-cmd">
    <p v-if="plugin && pluginSlug" class="install-cmd__from">
      From plugin
      <NuxtLink :to="`/plugins/${pluginSlug}`" class="install-cmd__plugin-link">
        {{ plugin }}
      </NuxtLink>
    </p>

    <div class="install-cmd__header">
      <span class="install-cmd__label">Install</span>
    </div>

    <div class="install-cmd__row">
      <!-- select-all so triple-click / ⌘A inside the box selects the whole
           command (not just one word) for users who still prefer manual copy.
           MDC may wrap the slot text in <p>; CSS below strips its margins so
           the code box height stays compact. -->
      <code ref="codeEl" class="install-cmd__code"><slot /></code>
      <button
        type="button"
        class="install-cmd__btn"
        aria-label="Copy install command"
        :data-state="state"
        @click="copy"
      >
        <span v-if="state === 'copied'">Copied</span>
        <span v-else-if="state === 'error'">Failed</span>
        <span v-else>Copy</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.install-cmd {
  @apply my-6 border border-terminal-border bg-terminal-surface-0 p-4 shadow-stamp-sm;
}
.install-cmd__from {
  @apply mb-3 font-mono text-xs text-terminal-text-muted;
}
.install-cmd__plugin-link {
  @apply text-primary no-underline border-b border-primary/40 hover:border-primary;
}
.install-cmd__header {
  @apply flex items-baseline justify-between gap-3 mb-2;
}
.install-cmd__label {
  @apply font-display font-bold uppercase tracking-widest text-xs text-terminal-text;
}
.install-cmd__row {
  @apply flex items-stretch gap-2;
}
.install-cmd__code {
  @apply flex-1 min-w-0 font-mono text-sm bg-terminal-bg border border-terminal-border px-3 py-2 text-terminal-text break-all select-all;
}
/* MDC wraps block-slot content in <p> by default. Strip its margins so the
   <code> box stays the size of one line instead of inheriting prose spacing.
   :deep() reaches across the scoped boundary to the slotted nodes. */
.install-cmd__code :deep(p) {
  @apply m-0 inline;
}
.install-cmd__btn {
  @apply inline-flex items-center justify-center px-3 py-2
         font-display font-bold uppercase tracking-widest text-xs
         border border-terminal-border bg-terminal-bg text-terminal-text-secondary
         cursor-pointer transition-colors;
  min-width: 5.5rem;
}
.install-cmd__btn:hover {
  @apply bg-terminal-surface-1 text-terminal-text;
}
.install-cmd__btn:focus-visible {
  @apply outline-none ring-2 ring-primary ring-offset-0;
}
.install-cmd__btn[data-state='copied'] {
  @apply bg-primary text-terminal-bg border-primary;
}
.install-cmd__btn[data-state='error'] {
  @apply text-terminal-text-muted;
}
</style>
