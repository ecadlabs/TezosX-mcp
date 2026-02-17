<script setup lang="ts">
import { ref } from 'vue'
import { copyToClipboard } from '@/utils'
import { useWalletStore } from '@/stores/wallet'
import type { Keypair } from '@/types'
import KeypairDisplay from './KeypairDisplay.vue'

const props = defineProps<{
  contractAddress: string
  keypair: Keypair
}>()

const emit = defineEmits<{
  continue: []
}>()

const walletStore = useWalletStore()
const copyFeedback = ref('')
const showConfigKey = ref(false)

async function handleCopy(text: string, label: string): Promise<void> {
  await copyToClipboard(text)
  copyFeedback.value = label
  setTimeout(() => { copyFeedback.value = '' }, 2000)
}

function buildMcpConfig(maskKey: boolean): string {
  const key = maskKey
    ? props.keypair.secretKey.slice(0, 4) + '\u2022'.repeat(24)
    : props.keypair.secretKey
  return JSON.stringify({
    mcpServers: {
      tezos: {
        command: 'npx',
        args: ['-y', '@ecadlabs/tezosx-mcp'],
        env: {
          TEZOS_NETWORK: walletStore.networkId,
          SPENDING_CONTRACT: props.contractAddress,
          SPENDING_PRIVATE_KEY: key,
        },
      },
    },
  }, null, 2)
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

    <!-- MCP Server Configuration -->
    <div class="card-subtle p-4 mb-4 border-2 border-amber-200 bg-amber-50/50">
      <div class="flex items-center gap-2 mb-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
        <span class="font-semibold text-amber-800">Save Your MCP Server Configuration</span>
      </div>
      <p class="text-sm text-amber-700 mb-4">
        You'll need both values below to configure your MCP server. Save them now — the spending key won't be shown again.
      </p>

      <!-- Contract Address -->
      <div class="mb-3">
        <label class="label">contract address</label>
        <div class="flex items-center gap-2">
          <code class="mono bg-white px-2 py-1.5 rounded flex-1 break-all text-sm border border-amber-200">
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

      <!-- Spending Key -->
      <KeypairDisplay :keypair="keypair" secret-label="spending key" />
    </div>

    <!-- Claude Desktop Setup -->
    <div class="card-subtle p-4 mb-4">
      <label class="label mb-2">// Claude Desktop configuration</label>
      <p class="text-sm text-text-muted mb-3">
        Add the following to your <code class="mono text-xs bg-gray-100 px-1 py-0.5 rounded">claude_desktop_config.json</code> file.
        You can find it via Claude Desktop's Settings menu under "Developer".
      </p>
      <pre class="mono bg-gray-50 border border-gray-200 rounded p-3 text-xs overflow-x-auto mb-3 whitespace-pre-wrap break-all">{{ buildMcpConfig(!showConfigKey) }}</pre>
      <div class="flex gap-2">
        <button
          @click="showConfigKey = !showConfigKey"
          class="btn-secondary flex items-center justify-center gap-2"
          :title="showConfigKey ? 'Hide spending key' : 'Show spending key'"
        >
          <svg v-if="!showConfigKey" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
          </svg>
        </button>
        <button
          @click="handleCopy(buildMcpConfig(false), 'config')"
          class="btn-secondary flex-1 flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          {{ copyFeedback === 'config' ? 'Copied!' : 'Copy Configuration' }}
        </button>
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
