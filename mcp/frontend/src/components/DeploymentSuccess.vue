<script setup lang="ts">
import { ref } from 'vue'
import { copyToClipboard } from '@/utils'
import { useWalletStore } from '@/stores/wallet'
import { useDeploymentMode } from '@/composables/useDeploymentMode'

const props = defineProps<{
  contractAddress: string
  spendingKey?: string
  configSaveFailed?: boolean
}>()

const emit = defineEmits<{
  continue: []
  configSaved: []
}>()

const walletStore = useWalletStore()
const { isLocal } = useDeploymentMode()
const copyFeedback = ref('')
const showSecret = ref(false)
const isSaving = ref(false)
const saveError = ref('')

async function retrySaveConfig(): Promise<void> {
  isSaving.value = true
  saveError.value = ''
  try {
    const res = await fetch('/api/save-contract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contractAddress: props.contractAddress, network: walletStore.networkId }),
    })
    if (!res.ok) throw new Error('Failed to save contract configuration')
    emit('configSaved')
  } catch (err) {
    saveError.value = err instanceof Error ? err.message : 'Save failed'
  } finally {
    isSaving.value = false
  }
}

async function handleCopy(text: string, label: string): Promise<void> {
  await copyToClipboard(text)
  copyFeedback.value = label
  setTimeout(() => { copyFeedback.value = '' }, 2000)
}

function buildEnvBlock(): string {
  const key = showSecret.value
    ? props.spendingKey
    : props.spendingKey?.slice(0, 4) + '\u2022'.repeat(24)
  return `SPENDING_PRIVATE_KEY=${key}\nSPENDING_CONTRACT=${props.contractAddress}\nTEZOS_NETWORK=${walletStore.networkId}`
}

function buildEnvBlockRaw(): string {
  return `SPENDING_PRIVATE_KEY=${props.spendingKey}\nSPENDING_CONTRACT=${props.contractAddress}\nTEZOS_NETWORK=${walletStore.networkId}`
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

    <!-- Local: config save failed — retry option -->
    <div v-if="isLocal && configSaveFailed" class="card-subtle p-4 mb-4 border-2 border-red-200 bg-red-50/50">
      <div class="flex items-center gap-2 mb-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
        <span class="font-semibold text-red-800">Failed to Save Configuration</span>
      </div>
      <p class="text-sm text-red-700 mb-3">
        Your contract was deployed on-chain at <code class="mono text-xs bg-red-100 px-1 py-0.5 rounded">{{ contractAddress }}</code>,
        but the spending key could not be saved to the MCP server.
      </p>
      <button
        @click="retrySaveConfig"
        :disabled="isSaving"
        class="btn-primary w-full flex items-center justify-center gap-2"
      >
        <span v-if="isSaving" class="spinner"></span>
        {{ isSaving ? 'Saving...' : 'Retry Save' }}
      </button>
      <p v-if="saveError" class="text-sm text-error mt-2">{{ saveError }}</p>
    </div>

    <!-- Local: auto-configured notice -->
    <div v-else-if="isLocal" class="card-subtle p-4 mb-4 border-2 border-green-200 bg-green-50/50">
      <div class="flex items-center gap-2 mb-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
        </svg>
        <span class="font-semibold text-green-800">MCP Server Configured Automatically</span>
      </div>
      <p class="text-sm text-green-700 mb-4">
        Your spending key and contract address have been saved to your MCP server.
        No manual configuration needed — your MCP tools are ready to use.
      </p>

      <div v-if="spendingKey">
        <pre class="mono bg-gray-50 border border-gray-200 rounded p-3 text-xs overflow-x-auto mb-3 whitespace-pre-wrap break-all">{{ buildEnvBlock() }}</pre>

        <div class="flex gap-2">
          <button
            @click="showSecret = !showSecret"
            class="btn-secondary !py-1.5 !px-2"
            :title="showSecret ? 'Hide spending key' : 'Show spending key'"
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
            @click="handleCopy(buildEnvBlockRaw(), 'env')"
            class="btn-secondary flex-1 flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            {{ copyFeedback === 'env' ? 'Copied!' : 'Copy Environment Variables' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Remote: show env vars to copy -->
    <div v-else class="card-subtle p-4 mb-4 border-2 border-amber-200 bg-amber-50/50">
      <div class="flex items-center gap-2 mb-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
        <span class="font-semibold text-amber-800">Manual Configuration Required</span>
      </div>
      <p class="text-sm text-amber-700 mb-4">
        Set these environment variables on your MCP server.
        The spending key won't be shown again after you leave this page.
      </p>

      <pre class="mono bg-gray-50 border border-gray-200 rounded p-3 text-xs overflow-x-auto mb-3 whitespace-pre-wrap break-all">{{ buildEnvBlock() }}</pre>

      <div class="flex gap-2">
        <button
          @click="showSecret = !showSecret"
          class="btn-secondary !py-1.5 !px-2"
          :title="showSecret ? 'Hide spending key' : 'Show spending key'"
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
          @click="handleCopy(buildEnvBlockRaw(), 'env')"
          class="btn-secondary flex-1 flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          {{ copyFeedback === 'env' ? 'Copied!' : 'Copy Environment Variables' }}
        </button>
      </div>
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
