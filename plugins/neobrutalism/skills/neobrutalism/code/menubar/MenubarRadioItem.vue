<script setup lang="ts">
import type { MenubarRadioItemEmits, MenubarRadioItemProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { Circle } from 'lucide-vue-next'
import {
  MenubarItemIndicator,
  MenubarRadioItem,

  useForwardPropsEmits,
} from 'reka-ui'
import { cn } from '@/lib/utils'

const props = defineProps<MenubarRadioItemProps & { class?: HTMLAttributes['class'] }>()
const emits = defineEmits<MenubarRadioItemEmits>()

const delegatedProps = reactiveOmit(props, 'class')

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <MenubarRadioItem
    data-slot="menubar-radio-item"
    v-bind="forwarded"
    :class="cn(
      `focus:bg-main focus:text-main-foreground relative flex cursor-default items-center gap-2 py-2 pr-3 pl-9 text-sm font-medium outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 transition-none border-2 border-transparent hover:border-black hover:bg-main hover:text-main-foreground`,
      props.class,
    )"
  >
    <span class="pointer-events-none absolute left-2 flex size-4 items-center justify-center border-2 border-black bg-white">
      <MenubarItemIndicator>
        <Circle class="size-2 fill-current stroke-[2]" />
      </MenubarItemIndicator>
    </span>
    <slot />
  </MenubarRadioItem>
</template>
