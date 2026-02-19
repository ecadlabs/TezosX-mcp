<script setup lang="ts">
import { ref } from 'vue'
import { useContractStore } from '@/stores'
import ConfirmationModal from './ConfirmationModal.vue'

const contractStore = useContractStore()

// State
const showConfirmModal = ref(false)
const isRegenerating = ref(false)
const rotationSuccess = ref(false)
const fundingFailed = ref(false)
const newSpenderAddress = ref('')

async function generateKeypairOnServer(): Promise<{ address: string; publicKey: string }> {
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

async function handleRegenerateConfirm(): Promise<void> {
  isRegenerating.value = true

  try {
    // Generate new keypair on server (private key saved to disk, old signer stays active)
    const { address } = await generateKeypairOnServer()

    // Update contract with new spender on-chain
    await contractStore.setSpender(address)

    // On-chain tx confirmed — now activate the new signer on the MCP server
    await activateKeyOnServer()

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

      <p class="text-sm text-green-700 mb-3">
        Your MCP server has been automatically updated with the new spending key. No manual configuration needed.
      </p>

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
            This will generate a new spending keypair, update the contract, and fund the new
            spender with {{ SPENDER_INITIAL_FUNDING_XTZ }} XTZ for gas fees.
            The current spender key will <strong>stop working immediately</strong>.
            Your MCP server will be updated automatically.
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
      :message="`This action cannot be undone. The current spender key will be invalidated immediately and any services using it will lose access. The new spender will be funded with ${SPENDER_INITIAL_FUNDING_XTZ} XTZ from the contract for gas fees.`"
      confirm-text="Regenerate"
      cancel-text="Cancel"
      variant="danger"
      :is-loading="isRegenerating"
      @confirm="handleRegenerateConfirm"
      @cancel="showConfirmModal = false"
    />
  </section>
</template>
