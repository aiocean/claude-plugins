<script setup lang="ts">
import type { MenubarItemEmits, MenubarItemProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import {
  MenubarItem,

  useForwardPropsEmits,
} from 'reka-ui'
import { cn } from '@/lib/utils'

const props = defineProps<MenubarItemProps & {
  class?: HTMLAttributes['class']
  inset?: boolean
  variant?: 'default' | 'destructive'
}>()

const emits = defineEmits<MenubarItemEmits>()

const delegatedProps = reactiveOmit(props, 'class', 'inset', 'variant')
const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <MenubarItem
    data-slot="menubar-item"
    :data-inset="inset ? '' : undefined"
    :data-variant="variant"
    v-bind="forwarded"
    :class="cn(
      `relative flex cursor-default items-center gap-2 px-3 py-2 text-sm font-medium outline-hidden select-none`,
      `border-2 border-transparent transition-none`,
      `hover:border-black hover:bg-black hover:text-white`,
      `focus:bg-black focus:text-white`,
      `data-[disabled]:pointer-events-none data-[disabled]:opacity-50`,
      `data-[inset]:pl-8`,
      `data-[variant=destructive]:text-red-600`,
      `data-[variant=destructive]:hover:bg-red-500 data-[variant=destructive]:hover:text-white`,
      `data-[variant=destructive]:focus:bg-red-500 data-[variant=destructive]:focus:text-white`,
      `[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4`,
      props.class,
    )"
  >
    <slot />
  </MenubarItem>
</template>
