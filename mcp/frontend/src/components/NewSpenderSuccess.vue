<script setup lang="ts">
import type { Keypair } from '@/types'
import KeypairDisplay from './KeypairDisplay.vue'

defineProps<{
  keypair: Keypair
}>()

const emit = defineEmits<{
  done: []
}>()
</script>

<template>
  <div class="card-subtle p-4 border-2 border-green-200 bg-green-50/50">
    <div class="flex items-center gap-2 mb-3">
      <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <span class="font-semibold text-green-800">Spender Updated Successfully</span>
    </div>

    <div class="bg-amber-50 border border-amber-200 rounded p-3 mb-4">
      <div class="flex items-start gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
        <p class="text-sm text-amber-700">
          Save this keypair now - you won't see it again. Update your MCP server configuration with the new secret key.
        </p>
      </div>
    </div>

    <KeypairDisplay :keypair="keypair" address-label="new spender address" />

    <!-- Actions -->
    <div class="flex gap-2 mt-4">
      <button
        @click="emit('done')"
        class="btn-primary flex-1"
      >
        Done
      </button>
    </div>
  </div>
</template>
