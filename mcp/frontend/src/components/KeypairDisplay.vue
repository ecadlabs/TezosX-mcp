<script setup lang="ts">
import { ref } from 'vue'
import { copyToClipboard } from '@/utils'
import type { Keypair } from '@/types'

const props = defineProps<{
  keypair: Keypair
  secretLabel?: string
}>()

const copyFeedback = ref('')
const showSecret = ref(false)

async function handleCopy(text: string, label: string): Promise<void> {
  await copyToClipboard(text)
  copyFeedback.value = label
  setTimeout(() => { copyFeedback.value = '' }, 2000)
}

function downloadKeypair(): void {
  const data = JSON.stringify(props.keypair, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `spending-keypair-${props.keypair.address.slice(0, 8)}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}
</script>

<template>
  <!-- Secret Key -->
  <div class="mb-4">
    <label class="label">{{ secretLabel ?? 'secret key' }}</label>
    <div class="flex items-stretch gap-2">
      <code class="mono bg-error/5 text-error/80 px-2 py-1.5 rounded flex-1 break-all text-sm border border-red-200 flex items-center">
        {{ showSecret ? keypair.secretKey : keypair.secretKey.slice(0, 4) + '\u2022'.repeat(24) }}
      </code>
      <button
        @click="showSecret = !showSecret"
        class="btn-secondary !py-1.5 !px-2 text-xs"
        :title="showSecret ? 'Hide secret key' : 'Show secret key'"
      >
        <svg v-if="!showSecret" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
        </svg>
      </button>
      <button
        @click="handleCopy(keypair.secretKey, 'secret')"
        class="btn-secondary !py-1.5 !px-2 text-xs"
      >
        {{ copyFeedback === 'secret' ? 'Copied!' : 'Copy' }}
      </button>
    </div>
  </div>

  <!-- Download Button -->
  <button
    @click="downloadKeypair()"
    class="btn-secondary w-full flex items-center justify-center gap-2"
  >
    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
    Download Keypair JSON
  </button>
</template>
