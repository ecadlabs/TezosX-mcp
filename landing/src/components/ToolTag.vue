<script setup lang="ts">
defineProps<{
  name: string
}>()
</script>

<template>
  <span class="font-mono text-[13px] px-4 py-[9px] rounded-md border cursor-default transition-all duration-200 inline-block bg-white/[0.025] border-white/5 text-[#888] hover:bg-accent/[0.06] hover:border-accent/25 hover:text-accent">{{ name }}</span>
</template>
