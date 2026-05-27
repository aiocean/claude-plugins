<!-- Layer ships its own app.vue (NuxtPage shell). This file exists so
     `nuxt prepare` is happy with a known entry; deep-merge would pick up
     the layer's default otherwise but being explicit here documents the
     boundary. Replace with custom shell if the layer's default isn't
     suitable. -->
<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
