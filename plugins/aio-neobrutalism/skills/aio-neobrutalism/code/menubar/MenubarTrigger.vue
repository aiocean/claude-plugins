<script setup lang="ts">
import type { MenubarTriggerProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { MenubarTrigger, useForwardProps } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = defineProps<MenubarTriggerProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = reactiveOmit(props, 'class')

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <MenubarTrigger
    data-slot="menubar-trigger"
    v-bind="forwardedProps"
    :class="
      cn(
        'focus:bg-black focus:text-white data-[state=open]:bg-black data-[state=open]:text-white flex items-center px-3 py-1.5 text-sm font-bold outline-hidden select-none transition-none border-2 border-transparent hover:border-black',
        props.class,
      )
    "
  >
    <slot />
  </MenubarTrigger>
</template>
