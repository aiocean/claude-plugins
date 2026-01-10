<script setup lang="ts">
import type { HTMLAttributes } from 'vue'

import { cn } from '@/lib/utils'

interface Props {
  message?: string
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<Props>(), {
  message: 'AI is generating...',
})
</script>

<template>
  <div
    :class="
      cn(
        'absolute inset-0 z-10 flex flex-col items-center justify-center gap-6',
        'bg-gradient-to-br from-lime-100 via-yellow-50 to-amber-100',
        'border-4 border-black',
        props.class,
      )
    "
  >
    <!-- Animated background pattern -->
    <div class="absolute inset-0 overflow-hidden opacity-10">
      <div class="grid-pattern" />
    </div>

    <!-- Main content -->
    <div class="relative z-10 flex flex-col items-center gap-6">
      <!-- AI Sparkle Icon with rotating elements -->
      <div class="icon-container">
        <!-- Rotating outer ring -->
        <div class="rotate-ring">
          <div class="ring-segment ring-segment-1" />
          <div class="ring-segment ring-segment-2" />
          <div class="ring-segment ring-segment-3" />
          <div class="ring-segment ring-segment-4" />
        </div>

        <!-- Center sparkle icon -->
        <div class="sparkle-icon">
          <svg
            class="size-12"
            fill="none"
            stroke="currentColor"
            stroke-width="3"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              stroke-linecap="square"
              stroke-linejoin="miter"
              d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 22l-.394-1.433a2.25 2.25 0 00-1.423-1.423L13.25 19l1.433-.394a2.25 2.25 0 001.423-1.423L16.5 15.75l.394 1.433a2.25 2.25 0 001.423 1.423L19.75 19l-1.433.394a2.25 2.25 0 00-1.423 1.423z"
            />
          </svg>
        </div>

        <!-- Floating particles -->
        <div class="particle particle-1" />
        <div class="particle particle-2" />
        <div class="particle particle-3" />
        <div class="particle particle-4" />
      </div>

      <!-- Message Text with animated gradient -->
      <div class="text-center space-y-2">
        <h3 class="text-2xl font-black text-black uppercase tracking-wider message-text">
          {{ message }}
        </h3>
        <div class="flex items-center justify-center gap-2">
          <div class="progress-bar">
            <div class="progress-bar-fill" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Grid background pattern */
.grid-pattern {
  position: absolute;
  inset: -100%;
  width: 200%;
  height: 200%;
  background-image:
    linear-gradient(#000 2px, transparent 2px),
    linear-gradient(90deg, #000 2px, transparent 2px);
  background-size: 40px 40px;
  animation: grid-move 20s linear infinite;
}

@keyframes grid-move {
  0% {
    transform: translate(0, 0);
  }
  100% {
    transform: translate(40px, 40px);
  }
}

/* Icon container */
.icon-container {
  position: relative;
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Rotating ring */
.rotate-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  animation: rotate 3s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Ring segments */
.ring-segment {
  position: absolute;
  width: 16px;
  height: 16px;
  background: #000;
  border: 2px solid #000;
}

.ring-segment-1 {
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  box-shadow: 3px 3px 0 #000;
}

.ring-segment-2 {
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  box-shadow: 3px 3px 0 #000;
}

.ring-segment-3 {
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  box-shadow: 3px 3px 0 #000;
}

.ring-segment-4 {
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  box-shadow: 3px 3px 0 #000;
}

/* Center sparkle icon */
.sparkle-icon {
  position: relative;
  z-index: 2;
  animation: sparkle-pulse 2s ease-in-out infinite;
  color: #000;
  filter: drop-shadow(4px 4px 0 rgba(0, 0, 0, 0.3));
}

@keyframes sparkle-pulse {
  0%, 100% {
    transform: scale(1) rotate(0deg);
  }
  25% {
    transform: scale(1.1) rotate(-5deg);
  }
  50% {
    transform: scale(1.15) rotate(0deg);
  }
  75% {
    transform: scale(1.1) rotate(5deg);
  }
}

/* Floating particles */
.particle {
  position: absolute;
  width: 8px;
  height: 8px;
  background: #000;
  border: 2px solid #000;
  box-shadow: 2px 2px 0 #000;
}

.particle-1 {
  top: 10%;
  left: 10%;
  animation: float 3s ease-in-out infinite;
}

.particle-2 {
  top: 10%;
  right: 10%;
  animation: float 3s ease-in-out 0.5s infinite;
}

.particle-3 {
  bottom: 10%;
  left: 10%;
  animation: float 3s ease-in-out 1s infinite;
}

.particle-4 {
  bottom: 10%;
  right: 10%;
  animation: float 3s ease-in-out 1.5s infinite;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
  50% {
    transform: translateY(-15px) scale(1.2);
    opacity: 0.7;
  }
}

/* Message text animation */
.message-text {
  animation: text-glow 2s ease-in-out infinite;
  text-shadow: 3px 3px 0 rgba(0, 0, 0, 0.1);
}

@keyframes text-glow {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.85;
  }
}

/* Progress bar */
.progress-bar {
  width: 200px;
  height: 8px;
  background: #fff;
  border: 3px solid #000;
  overflow: hidden;
  position: relative;
  box-shadow: 3px 3px 0 #000;
}

.progress-bar-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
  background: repeating-linear-gradient(
    45deg,
    #000,
    #000 10px,
    #fde047 10px,
    #fde047 20px
  );
  animation: progress-slide 1.5s linear infinite;
}

@keyframes progress-slide {
  0% {
    transform: translateX(-28.28px);
  }
  100% {
    transform: translateX(0);
  }
}
</style>
