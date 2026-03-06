<script setup lang="ts">
import type { MenubarSubTriggerProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { ChevronRight } from 'lucide-vue-next'
import { MenubarSubTrigger, useForwardProps } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = defineProps<MenubarSubTriggerProps & { class?: HTMLAttributes['class'], inset?: boolean }>()

const delegatedProps = reactiveOmit(props, 'class', 'inset')
const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <MenubarSubTrigger
    data-slot="menubar-sub-trigger"
    :data-inset="inset ? '' : undefined"
    v-bind="forwardedProps"
    :class="cn(
      'relative flex cursor-default items-center gap-2 px-3 py-2 text-sm font-medium outline-hidden select-none',
      'border-2 border-transparent transition-none',
      'hover:border-black hover:bg-black hover:text-white',
      'focus:bg-black focus:text-white',
      'data-[state=open]:bg-black data-[state=open]:text-white',
      'data-[inset]:pl-8',
      props.class,
    )"
  >
    <slot />
    <ChevronRight class="ml-auto size-4 stroke-[3]" />
  </MenubarSubTrigger>
</template>
