<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Props {
	/** The toggle state (use v-model) */
	modelValue?: boolean
	/** Show the indicator dot when active */
	showIndicator?: boolean
	/** Additional CSS classes */
	class?: HTMLAttributes['class']
	/** Accessible label for screen readers */
	ariaLabel?: string
	/** Disable the toggle button */
	disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
	modelValue: false,
	showIndicator: false,
	disabled: false,
})

const emit = defineEmits<{
	'update:modelValue': [value: boolean]
}>()

const toggleState = computed(() => props.modelValue)

function handleToggle() {
	if (!props.disabled) {
		emit('update:modelValue', !props.modelValue)
	}
}

const accessibleLabel = computed(() => {
	if (props.ariaLabel) {
		return `${props.ariaLabel}: ${toggleState.value ? 'enabled' : 'disabled'}`
	}
	return undefined
})
</script>

<template>
	<Button
		variant="neutral"
		size="sm"
		role="switch"
		:aria-checked="toggleState"
		:aria-label="accessibleLabel"
		:disabled="disabled"
		:class="
			cn(
				'relative sketchy-wiggle',
				toggleState
					? 'bg-main text-foreground shadow-none'
					: 'bg-secondary shadow-shadow hover:bg-main/10',
				props.class
			)
		"
		@click="handleToggle"
		@keydown.enter="handleToggle"
		@keydown.space.prevent="handleToggle"
	>
		<!-- Active indicator dot (optional) -->
		<div
			v-if="showIndicator && toggleState"
			class="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-foreground border-2 border-background rounded-full"
		/>

		<!-- Button label content -->
		<slot />
	</Button>
</template>
