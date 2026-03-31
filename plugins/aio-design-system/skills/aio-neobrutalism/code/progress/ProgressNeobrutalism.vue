<script setup lang="ts">
import type { ProgressRootProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { computed } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import {
  ProgressIndicator,
  ProgressRoot,
} from 'reka-ui'
import { cn } from '@/lib/utils'

interface ProgressNeobruttalismProps extends ProgressRootProps {
  class?: HTMLAttributes['class']
  indicatorClass?: HTMLAttributes['class']
}

const props = withDefaults(
  defineProps<ProgressNeobruttalismProps>(),
  {
    modelValue: 0,
  },
)

const delegatedProps = reactiveOmit(props, 'class', 'indicatorClass')

const percentage = computed(() => props.modelValue ?? 0)
</script>

<template>
  <ProgressRoot
    data-slot="progress-neobrutalism"
    v-bind="delegatedProps"
    :class="
      cn(
        'relative w-full overflow-hidden bg-gray-200 border-3 border-black shadow-[3px_3px_0_#000] doodle-dust',
        props.class,
      )
    "
  >
    <ProgressIndicator
      data-slot="progress-indicator"
      :class="
        cn(
          'h-full w-full flex-1 transition-all duration-300 ease-out',
          percentage > 0 && percentage < 100 ? 'border-r-3 border-black' : '',
          props.indicatorClass,
        )
      "
      :style="`transform: translateX(-${100 - percentage}%);`"
    />
  </ProgressRoot>
</template>
