<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  label?: string
  code: string
}>()

const copied = ref(false)

function copy() {
  navigator.clipboard?.writeText(props.code)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 1800)
}
</script>

<template>
  <div class="bg-[#0c0c0c] rounded-lg overflow-hidden border border-white/[0.06]">
    <div v-if="label" class="px-3.5 py-2 border-b border-white/[0.06] flex justify-between items-center">
      <span class="font-mono text-[11px] text-text-dim">{{ label }}</span>
      <button
        class="bg-transparent border-none cursor-pointer p-1 flex items-center gap-1 font-mono text-[11px] transition-colors duration-200"
        :class="copied ? 'text-accent' : 'text-text-dim'"
        @click="copy"
      >
        <svg v-if="!copied" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        {{ copied ? 'copied' : 'copy' }}
      </button>
    </div>
    <pre class="px-4 py-3.5 m-0 overflow-x-auto font-mono text-[13px] leading-[1.65] text-neutral-300"><code>{{ code }}</code></pre>
  </div>
</template>
