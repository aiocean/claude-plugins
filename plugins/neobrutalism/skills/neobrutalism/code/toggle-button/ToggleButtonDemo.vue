<script setup lang="ts">
import { ref } from 'vue'
import { ToggleButton } from './index'

const simpleToggle = ref(false)
const withIndicator = ref(true)
const withLabel = ref(false)
const option1 = ref(true)
const option2 = ref(false)
const option3 = ref(true)
const disabledToggle = ref(false)
</script>

<template>
	<div class="p-8 space-y-8 max-w-2xl">
		<div>
			<h2 class="text-2xl font-bold mb-4">ToggleButton Component Demo</h2>
			<p class="text-sm text-muted-foreground mb-6">
				Examples of the ToggleButton component following neobrutalism design principles.
			</p>
		</div>

		<!-- Simple Toggle -->
		<div class="space-y-2">
			<h3 class="text-lg font-semibold">Simple Toggle</h3>
			<ToggleButton v-model="simpleToggle">
				<span class="text-xs font-medium">Enable Feature</span>
			</ToggleButton>
			<p class="text-sm text-muted-foreground">State: {{ simpleToggle ? 'ON' : 'OFF' }}</p>
		</div>

		<!-- Toggle with Indicator -->
		<div class="space-y-2">
			<h3 class="text-lg font-semibold">Toggle with Indicator Dot</h3>
			<ToggleButton v-model="withIndicator" :show-indicator="true">
				<span class="text-xs font-medium">Auto-translate All</span>
			</ToggleButton>
			<p class="text-sm text-muted-foreground">State: {{ withIndicator ? 'ON' : 'OFF' }}</p>
		</div>

		<!-- Toggle with Aria Label -->
		<div class="space-y-2">
			<h3 class="text-lg font-semibold">Toggle with Accessibility Label</h3>
			<ToggleButton v-model="withLabel" aria-label="Dark mode toggle">
				<span class="text-xs font-medium">Dark Mode</span>
			</ToggleButton>
			<p class="text-sm text-muted-foreground">State: {{ withLabel ? 'ON' : 'OFF' }}</p>
		</div>

		<!-- Toggle Group -->
		<div class="space-y-2">
			<h3 class="text-lg font-semibold">Toggle Group (Multiple Options)</h3>
			<div class="flex gap-2">
				<ToggleButton v-model="option1" :show-indicator="true" class="flex-1">
					<span class="text-xs font-medium">Option 1</span>
				</ToggleButton>

				<ToggleButton v-model="option2" :show-indicator="true" class="flex-1">
					<span class="text-xs font-medium">Option 2</span>
				</ToggleButton>

				<ToggleButton v-model="option3" :show-indicator="true" class="flex-1">
					<span class="text-xs font-medium">Option 3</span>
				</ToggleButton>
			</div>
			<p class="text-sm text-muted-foreground">
				States: Option 1: {{ option1 ? 'ON' : 'OFF' }}, Option 2: {{ option2 ? 'ON' : 'OFF' }},
				Option 3: {{ option3 ? 'ON' : 'OFF' }}
			</p>
		</div>

		<!-- Disabled Toggle -->
		<div class="space-y-2">
			<h3 class="text-lg font-semibold">Disabled Toggle</h3>
			<ToggleButton v-model="disabledToggle" :disabled="true">
				<span class="text-xs font-medium">Disabled Feature</span>
			</ToggleButton>
			<p class="text-sm text-muted-foreground">
				This toggle is disabled and cannot be interacted with.
			</p>
		</div>

		<!-- Usage Instructions -->
		<div class="mt-8 p-4 bg-secondary border-3 border-border rounded-base">
			<h3 class="text-lg font-semibold mb-2">Keyboard Accessibility</h3>
			<ul class="text-sm space-y-1 list-disc list-inside">
				<li><kbd>Tab</kbd> to focus the toggle button</li>
				<li><kbd>Enter</kbd> or <kbd>Space</kbd> to toggle the state</li>
			</ul>
		</div>
	</div>
</template>
