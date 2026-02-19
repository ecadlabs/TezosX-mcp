<script setup lang="ts">
import { ref } from 'vue'
import { copyToClipboard } from '@/utils'

const props = defineProps<{
  contractAddress: string
}>()

const emit = defineEmits<{
  continue: []
}>()

const copyFeedback = ref('')

async function handleCopy(text: string, label: string): Promise<void> {
  await copyToClipboard(text)
  copyFeedback.value = label
  setTimeout(() => { copyFeedback.value = '' }, 2000)
}
</script>

<template>
  <section class="card p-5 mb-5">
    <div class="text-center mb-5">
      <div class="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-3">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 class="text-lg font-semibold text-text-primary">Contract Deployed Successfully</h2>
    </div>

    <!-- Auto-configured notice -->
    <div class="card-subtle p-4 mb-4 border-2 border-green-200 bg-green-50/50">
      <div class="flex items-center gap-2 mb-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
        </svg>
        <span class="font-semibold text-green-800">MCP Server Configured Automatically</span>
      </div>
      <p class="text-sm text-green-700">
        Your spending key and contract address have been saved to your MCP server.
        No manual configuration needed — your MCP tools are ready to use.
      </p>
    </div>

    <!-- Contract Address -->
    <div class="card-subtle p-4 mb-4">
      <div class="mb-3">
        <label class="label">contract address</label>
        <div class="flex items-center gap-2">
          <code class="mono bg-white px-2 py-1.5 rounded flex-1 break-all text-sm border border-gray-200">
            {{ contractAddress }}
          </code>
          <button
            @click="handleCopy(contractAddress, 'contract')"
            class="btn-secondary !py-1.5 !px-2 text-xs"
          >
            {{ copyFeedback === 'contract' ? 'Copied!' : 'Copy' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Continue Button -->
    <button
      @click="emit('continue')"
      class="btn-primary w-full"
    >
      Continue to Dashboard
    </button>
  </section>
</template>
