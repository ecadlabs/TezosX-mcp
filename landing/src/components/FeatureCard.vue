<script setup lang="ts">
defineProps<{
  icon: string
  title: string
  desc: string
}>()
</script>

<template>
  <div class="bg-surface border border-border rounded-xl px-[22px] py-6 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-[3px] hover:shadow-[0_8px_30px_rgba(0,0,0,0.25)]">
    <div class="mb-3.5 text-accent transition-colors duration-300">
      <!-- Shield -->
      <svg v-if="icon === 'shield'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
      <!-- Wallet -->
      <svg v-if="icon === 'wallet'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M16 12h.01" />
        <path d="M2 10h20" />
      </svg>
      <!-- Zap -->
      <svg v-if="icon === 'zap'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
      <!-- Key -->
      <svg v-if="icon === 'key'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
      </svg>
    </div>
    <p class="font-semibold text-[15px] mb-1.5 text-text-secondary">{{ title }}</p>
    <p class="text-text-dim text-[13px] leading-[1.65]">{{ desc }}</p>
  </div>
</template>
