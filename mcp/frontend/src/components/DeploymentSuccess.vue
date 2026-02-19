<script setup lang="ts">
defineProps<{
  contractAddress: string
}>()

const emit = defineEmits<{
  continue: []
}>()
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

    <!-- Fund reminder -->
    <div class="card-subtle p-4 mb-4 border border-amber-200 bg-amber-50/50">
      <div class="flex items-start gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
        <p class="text-sm text-amber-700">
          <strong>Next step:</strong> Send some XTZ to your spending contract so the MCP server has funds to work with.
          You can do this from the dashboard on the next page.
        </p>
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
