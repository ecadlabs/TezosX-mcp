<script setup lang="ts">
import { ref } from 'vue'
import { useWalletStore, useContractStore } from '@/stores'
import { useDeploymentMode } from '@/composables/useDeploymentMode'
import { generateKeypairLocally } from '@/utils/keygen'

const walletStore = useWalletStore()
const contractStore = useContractStore()
const { isLocal, detectMode } = useDeploymentMode()

// Local state
const existingContractAddress = ref('')
const originateDailyLimit = ref('100')
const originatePerTxLimit = ref('10')
const isDeploying = ref(false)
const deployError = ref('')

async function generateKeypairOnServer(): Promise<{ address: string; publicKey: string }> {
  const res = await fetch('/api/generate-keypair', { method: 'POST' })
  if (!res.ok) throw new Error('Failed to generate keypair on server')
  return res.json()
}

async function saveContractOnServer(contractAddress: string, network: string): Promise<void> {
  const res = await fetch('/api/save-contract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contractAddress, network }),
  })
  if (!res.ok) throw new Error('Failed to save contract configuration')
}

async function handleOriginate(): Promise<void> {
  if (!walletStore.userAddress) return

  isDeploying.value = true
  deployError.value = ''

  try {
    // Ensure mode detection is complete before branching on isLocal
    await detectMode()

    let spenderAddress: string
    let spendingKey: string | undefined

    if (isLocal.value) {
      // Local: generate keypair on server (private key stays server-side)
      const result = await generateKeypairOnServer()
      spenderAddress = result.address
    } else {
      // Remote: generate keypair in browser (user copies env vars manually)
      const keypair = await generateKeypairLocally()
      spenderAddress = keypair.address
      spendingKey = keypair.secretKey
    }

    const dailyLimit = parseFloat(originateDailyLimit.value) || 100
    const perTxLimit = parseFloat(originatePerTxLimit.value) || 10

    const contractAddress = await contractStore.originateContract(
      walletStore.userAddress,
      spenderAddress,
      dailyLimit,
      perTxLimit,
      spendingKey,
    )

    if (isLocal.value) {
      // Local: save contract address to server (completes config)
      // Handled separately — if this fails, the contract is already on-chain
      // and we still want to show the success screen with a retry option.
      try {
        await saveContractOnServer(contractAddress, walletStore.networkId)
      } catch (err) {
        console.error('Config save failed (contract deployed OK):', err)
        if (contractStore.deploymentResult) {
          contractStore.deploymentResult.configSaveFailed = true
        }
      }
    }
  } catch (error) {
    console.error('Deployment failed:', error)
    deployError.value = error instanceof Error ? error.message : 'Deployment failed'
  } finally {
    isDeploying.value = false
  }
}

function normalizeContractInput(input: string): string {
  // If it looks like a URL, try to extract contract param
  if (input.includes('://') || input.includes('?contract=')) {
    try {
      const url = new URL(input, window.location.origin)
      const contract = url.searchParams.get('contract')
      if (contract) return contract
    } catch {
      // Not a valid URL, continue with original input
    }
  }
  return input.trim()
}

async function handleConnectContract(): Promise<void> {
  if (!existingContractAddress.value) return
  const address = normalizeContractInput(existingContractAddress.value)
  await contractStore.setContractAddress(address)
  existingContractAddress.value = ''
}
</script>

<template>
  <section class="card p-5 mb-5">
    <p class="section-label mb-4">get started</p>

    <!-- Deploy New -->
    <div class="mb-5">
      <p class="text-sm font-medium text-text-primary mb-3">Deploy New Wallet Contract</p>
      <p class="text-sm text-text-muted mb-4">
        <template v-if="isLocal">
          A spending key will be automatically generated and saved to your MCP server.
          No manual configuration needed.
        </template>
        <template v-else>
          A spending key will be generated in your browser.
          After deployment, you'll receive environment variables to configure your MCP server.
        </template>
      </p>

      <div class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="label">daily limit (xtz)</label>
            <input v-model="originateDailyLimit" type="number" placeholder="100" class="input-field" />
          </div>
          <div>
            <label class="label">per-tx limit (xtz)</label>
            <input v-model="originatePerTxLimit" type="number" placeholder="10" class="input-field" />
          </div>
        </div>

        <button
          @click="handleOriginate"
          :disabled="!walletStore.isConnected || isDeploying || contractStore.isLoading"
          class="btn-primary w-full flex items-center justify-center gap-2"
        >
          <span v-if="isDeploying || contractStore.isLoading" class="spinner"></span>
          {{ !walletStore.isConnected ? 'Connect Wallet to Deploy' : isDeploying || contractStore.isLoading ? 'Deploying...' : 'Deploy Contract' }}
        </button>

        <p v-if="deployError" class="text-sm text-error mt-2">{{ deployError }}</p>
      </div>
    </div>

    <div class="divider"></div>

    <!-- Connect Existing -->
    <div>
      <p class="text-sm font-medium text-text-primary mb-3">Connect Existing Contract</p>
      <div class="flex gap-2">
        <input
          v-model="existingContractAddress"
          type="text"
          placeholder="KT1..."
          class="input-field mono flex-1"
        />
        <button
          @click="handleConnectContract"
          :disabled="!existingContractAddress || contractStore.isLoading"
          class="btn-secondary"
        >
          Connect
        </button>
      </div>
    </div>
  </section>
</template>
