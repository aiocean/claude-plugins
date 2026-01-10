<script setup lang="ts">
import type { MenubarContentProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import {
  MenubarContent,

  MenubarPortal,
  useForwardProps,
} from 'reka-ui'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<MenubarContentProps & { class?: HTMLAttributes['class'] }>(),
  {
    align: 'start',
    alignOffset: -4,
    sideOffset: 0,
  },
)

const delegatedProps = reactiveOmit(props, 'class')

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <MenubarPortal>
    <MenubarContent
      data-slot="menubar-content"
      v-bind="forwardedProps"
      :class="
        cn(
          'z-50 min-w-[12rem] origin-(--reka-menubar-content-transform-origin) overflow-hidden',
          'bg-main text-black border-4 border-black',
          'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
          props.class,
        )
      "
    >
      <slot />
    </MenubarContent>
  </MenubarPortal>
</template>
