<script setup lang="ts">
import { ref } from 'vue'
import { useContractStore } from '@/stores'
import { copyToClipboard } from '@/utils'
import { useDeploymentMode } from '@/composables/useDeploymentMode'
import { generateKeypairLocally } from '@/utils/keygen'
import ConfirmationModal from './ConfirmationModal.vue'

const contractStore = useContractStore()
const { isLocal, detectMode } = useDeploymentMode()

// State
const showConfirmModal = ref(false)
const isRegenerating = ref(false)
const rotationSuccess = ref(false)
const fundingFailed = ref(false)
const newSpenderAddress = ref('')
const newSpendingKey = ref('')
const showSecret = ref(false)
const copyFeedback = ref('')

async function generateKeypairOnServer(): Promise<{ address: string; publicKey: string; secretKey: string }> {
  const res = await fetch('/api/generate-keypair', { method: 'POST' })
  if (!res.ok) throw new Error('Failed to generate keypair on server')
  return res.json()
}

async function activateKeyOnServer(): Promise<void> {
  const res = await fetch('/api/activate-key', { method: 'POST' })
  if (!res.ok) throw new Error('Failed to activate key on server')
}

// Fund the new spender with enough tez for gas fees.
// Must match SPENDER_TOP_UP_TARGET in src/tools/send_xtz.ts
const SPENDER_INITIAL_FUNDING_XTZ = 0.5

async function handleCopy(text: string, label: string): Promise<void> {
  await copyToClipboard(text)
  copyFeedback.value = label
  setTimeout(() => { copyFeedback.value = '' }, 2000)
}

async function handleRegenerateConfirm(): Promise<void> {
  isRegenerating.value = true

  try {
    // Ensure mode detection is complete before branching on isLocal
    await detectMode()

    let address: string

    if (isLocal.value) {
      // Local: server generates keypair, private key persisted server-side
      const result = await generateKeypairOnServer()
      address = result.address
      newSpendingKey.value = result.secretKey
    } else {
      // Remote: generate keypair in browser
      const keypair = await generateKeypairLocally()
      address = keypair.address
      newSpendingKey.value = keypair.secretKey
    }

    // Update contract with new spender on-chain (same for both modes)
    await contractStore.setSpender(address)

    if (isLocal.value) {
      // On-chain tx confirmed — now activate the new signer on the MCP server
      await activateKeyOnServer()
    }

    // Try to fund the new spender — not critical, rotation is already complete
    try {
      await contractStore.withdraw(address, SPENDER_INITIAL_FUNDING_XTZ)
    } catch (err) {
      console.warn('Failed to fund new spender (contract balance may be too low):', err)
      fundingFailed.value = true
    }

    // Show success regardless of funding outcome
    newSpenderAddress.value = address
    rotationSuccess.value = true
    showConfirmModal.value = false
  } catch (error) {
    console.error('Failed to regenerate spender:', error)
  } finally {
    isRegenerating.value = false
  }
}

function handleDone(): void {
  rotationSuccess.value = false
  fundingFailed.value = false
  newSpenderAddress.value = ''
  newSpendingKey.value = ''
  showSecret.value = false
}
</script>

<template>
  <section class="card p-5 mb-5">
    <p class="section-label mb-4">spender key management</p>

    <!-- Success State -->
    <div v-if="rotationSuccess" class="card-subtle p-4 border-2 border-green-200 bg-green-50/50">
      <div class="flex items-center gap-2 mb-3">
        <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <span class="font-semibold text-green-800">Spender Updated Successfully</span>
      </div>

      <!-- Local: auto-configured message + key display -->
      <div v-if="isLocal" class="mb-3">
        <p class="text-sm text-green-700 mb-3">
          Your MCP server has been automatically updated with the new spending key. No manual configuration needed.
        </p>
        <div v-if="newSpendingKey">
          <label class="label">new spending key</label>
          <div class="flex items-stretch gap-2">
            <code class="mono bg-white px-2 py-1.5 rounded flex-1 break-all text-sm border border-green-200 flex items-center">
              {{ showSecret ? newSpendingKey : newSpendingKey.slice(0, 4) + '\u2022'.repeat(24) }}
            </code>
            <button
              @click="showSecret = !showSecret"
              class="btn-secondary !py-1.5 !px-2 text-xs"
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
              @click="handleCopy(newSpendingKey, 'key')"
              class="btn-secondary !py-1.5 !px-2 text-xs"
            >
              {{ copyFeedback === 'key' ? 'Copied!' : 'Copy' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Remote: show new spending key -->
      <div v-else class="mb-3">
        <p class="text-sm text-amber-700 mb-3">
          Update the <code class="mono text-xs bg-amber-100 px-1 py-0.5 rounded">SPENDING_PRIVATE_KEY</code>
          environment variable on your MCP server with the new key below and restart Claude Desktop.
          The key won't be shown again after you leave this page.
        </p>
        <div>
          <label class="label">new spending key</label>
          <div class="flex items-stretch gap-2">
            <code class="mono bg-white px-2 py-1.5 rounded flex-1 break-all text-sm border border-amber-200 flex items-center">
              {{ showSecret ? newSpendingKey : newSpendingKey.slice(0, 4) + '\u2022'.repeat(24) }}
            </code>
            <button
              @click="showSecret = !showSecret"
              class="btn-secondary !py-1.5 !px-2 text-xs"
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
              @click="handleCopy(newSpendingKey, 'key')"
              class="btn-secondary !py-1.5 !px-2 text-xs"
            >
              {{ copyFeedback === 'key' ? 'Copied!' : 'Copy' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Warning if funding failed -->
      <div v-if="fundingFailed" class="p-3 mb-3 rounded border border-amber-200 bg-amber-50/50">
        <div class="flex items-start gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
          <p class="text-sm text-amber-700">
            Could not fund the new spender with {{ SPENDER_INITIAL_FUNDING_XTZ }} XTZ for gas fees — the contract balance may be too low.
            Send some XTZ to the spender address below or fund the contract from the dashboard.
          </p>
        </div>
      </div>

      <div class="mb-4">
        <label class="label">new spender address</label>
        <code class="mono bg-white px-2 py-1.5 rounded block break-all text-sm border border-green-200">
          {{ newSpenderAddress }}
        </code>
      </div>

      <button @click="handleDone" class="btn-primary w-full">
        Done
      </button>
    </div>

    <!-- Default State: Regenerate option -->
    <div v-else class="card-subtle p-4 border border-amber-200 bg-amber-50/50">
      <div class="flex items-start gap-3 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
        <div>
          <p class="text-sm font-medium text-amber-800 mb-1">Regenerate Spender Keypair</p>
          <p class="text-sm text-amber-700">
            This will generate a new spending keypair and update the contract.
            <template v-if="isLocal">
              The new spender will be funded with {{ SPENDER_INITIAL_FUNDING_XTZ }} XTZ for gas fees.
            </template>
            The current spender key will <strong>stop working immediately</strong>.
            <template v-if="isLocal">
              Your MCP server will be updated automatically.
            </template>
            <template v-else>
              You will need to update the <code class="mono text-xs bg-amber-100 px-1 py-0.5 rounded">SPENDING_PRIVATE_KEY</code> environment variable on your MCP server.
            </template>
          </p>
        </div>
      </div>

      <button
        @click="showConfirmModal = true"
        :disabled="contractStore.isLoading"
        class="btn-danger w-full flex items-center justify-center gap-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Regenerate Spender Key
      </button>
    </div>

    <!-- Confirmation Modal -->
    <ConfirmationModal
      v-if="showConfirmModal"
      title="Regenerate Spender Key?"
      :message="isLocal
        ? `This action cannot be undone. The current spender key will be invalidated immediately and any services using it will lose access. The new spender will be funded with ${SPENDER_INITIAL_FUNDING_XTZ} XTZ from the contract for gas fees.`
        : 'This action cannot be undone. The current spender key will be invalidated immediately and any services using it will lose access. You will need to update the SPENDING_PRIVATE_KEY environment variable on your MCP server.'"
      confirm-text="Regenerate"
      cancel-text="Cancel"
      variant="danger"
      :is-loading="isRegenerating"
      @confirm="handleRegenerateConfirm"
      @cancel="showConfirmModal = false"
    />
  </section>
</template>
