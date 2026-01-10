<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <span
    data-slot="menubar-shortcut"
    :class="cn('text-black/60 ml-auto text-xs font-bold tracking-wider border border-black/20 px-1.5 py-0.5 bg-black/5', props.class)"
  >
    <slot />
  </span>
</template>
