<script setup lang="ts">
import type { MenubarSubContentEmits, MenubarSubContentProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import {
  MenubarPortal,
  MenubarSubContent,

  useForwardPropsEmits,
} from 'reka-ui'
import { cn } from '@/lib/utils'

const props = defineProps<MenubarSubContentProps & { class?: HTMLAttributes['class'] }>()
const emits = defineEmits<MenubarSubContentEmits>()

const delegatedProps = reactiveOmit(props, 'class')

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <MenubarPortal>
    <MenubarSubContent
      data-slot="menubar-sub-content"
      v-bind="forwarded"
      :class="
        cn(
          'bg-main text-black z-50 min-w-[8rem] origin-(--reka-menubar-content-transform-origin) overflow-hidden border-4 border-black translate-x-1 translate-y-1',
          'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
          props.class,
        )
      "
    >
      <slot />
    </MenubarSubContent>
  </MenubarPortal>
</template>
