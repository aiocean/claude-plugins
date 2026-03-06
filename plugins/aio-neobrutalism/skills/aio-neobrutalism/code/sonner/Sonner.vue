<script lang="ts" setup>
import type { ToasterProps } from 'vue-sonner'
import { Toaster as Sonner } from 'vue-sonner'

const props = defineProps<ToasterProps>()
</script>

<template>
  <Sonner
    class="toaster group"
    v-bind="props"
    :style="{
      '--normal-bg': '#fff',
      '--normal-text': '#000',
      '--normal-border': '#000',
      '--success-bg': '#fff',
      '--success-text': '#000',
      '--success-border': '#000',
      '--error-bg': '#fff',
      '--error-text': '#000',
      '--error-border': '#000',
      '--warning-bg': '#fff',
      '--warning-text': '#000',
      '--warning-border': '#000',
      '--info-bg': '#fff',
      '--info-text': '#000',
      '--info-border': '#000',
    }"
  />
</template>

<style>
/* Neobrutalism toast styles */
[data-sonner-toast] {
  border: 2.5px solid #000 !important;
  border-radius: 0 !important;
  box-shadow: 4px 4px 0 #000 !important;
  background-color: #fff !important;
  color: #000 !important;
  padding: 16px !important;
  font-weight: 500 !important;
}

[data-sonner-toast][data-type='success'] {
  border-color: #000 !important;
}

[data-sonner-toast][data-type='error'] {
  border-color: #000 !important;
  background-color: #fee !important;
}

[data-sonner-toast][data-type='warning'] {
  border-color: #000 !important;
  background-color: #ffc !important;
}

[data-sonner-toast] [data-title] {
  color: #000 !important;
  font-weight: 600 !important;
  font-size: 14px !important;
}

[data-sonner-toast] [data-description] {
  color: #000 !important;
  font-size: 13px !important;
}

[data-sonner-toast] [data-icon] {
  color: #000 !important;
}

[data-sonner-toast] [data-close-button] {
  border: 2px solid #000 !important;
  border-radius: 0 !important;
  background-color: #fff !important;
  color: #000 !important;
  box-shadow: 2px 2px 0 #000 !important;
  transition: all 100ms cubic-bezier(0.4, 0, 0.2, 1) !important;
}

[data-sonner-toast] [data-close-button]:hover {
  transform: translate(2px, 2px) !important;
  box-shadow: none !important;
  background-color: #000 !important;
  color: #fff !important;
}

/* Remove default animations for instant appearance */
[data-sonner-toast][data-mounted='true'] {
  animation: none !important;
}

[data-sonner-toast][data-removed='true'] {
  animation: none !important;
}
</style>
