<script setup lang="ts">
import { onMounted } from 'vue'
import { useWalletStore, useContractStore } from '@/stores'
import { NETWORKS, type NetworkId } from '@/utils'
import { useDeploymentMode } from '@/composables/useDeploymentMode'

// Components
import WalletConnection from './components/WalletConnection.vue'
import SetupSection from './components/SetupSection.vue'
import DeploymentSuccess from './components/DeploymentSuccess.vue'
import ContractInfo from './components/ContractInfo.vue'
import SpendingLimits from './components/SpendingLimits.vue'
import SpenderManagement from './components/SpenderManagement.vue'
import WithdrawFunds from './components/WithdrawFunds.vue'

const walletStore = useWalletStore()
const contractStore = useContractStore()
const { detectMode } = useDeploymentMode()

const networkOptions = Object.entries(NETWORKS).map(([id, config]) => ({
  id: id as NetworkId,
  name: config.name,
}))

async function handleNetworkChange(event: Event): Promise<void> {
  const target = event.target as HTMLSelectElement
  contractStore.clearContractAddress()
  await walletStore.switchNetwork(target.value as NetworkId)
}

onMounted(async () => {
  detectMode()

  const params = new URLSearchParams(window.location.search)

  // Handle network param before wallet init
  const networkParam = params.get('network')?.toLowerCase()
  if (networkParam && networkParam in NETWORKS) {
    await walletStore.switchNetwork(networkParam as NetworkId)
  }

  await walletStore.init()

  // Handle contract param
  const contractParam = params.get('contract')
  if (contractParam) {
    await contractStore.setContractAddress(contractParam)
    // Clear URL params on success
    if (contractStore.contractAddress) {
      params.delete('contract')
      params.delete('network')
      const newUrl = params.toString()
        ? `${window.location.pathname}?${params}`
        : window.location.pathname
      window.history.replaceState({}, '', newUrl)
    }
  } else if (contractStore.contractAddress) {
    await contractStore.loadContract()
  }
})
</script>

<template>
  <div class="film-grain"></div>

  <div class="min-h-screen py-12 px-4 sm:px-6 lg:px-8 relative z-10">
    <div class="max-w-2xl mx-auto">

      <!-- Header -->
      <header class="mb-6 flex items-center justify-between">
        <h1 class="text-3xl font-semibold tracking-tight text-text-primary">
          TezosX MCP Configuration
        </h1>
        <select
          :value="walletStore.networkId"
          @change="handleNetworkChange"
          class="text-xs text-text-muted bg-transparent border border-border rounded px-2 py-1 cursor-pointer hover:border-text-muted transition-colors"
        >
          <option v-for="network in networkOptions" :key="network.id" :value="network.id">
            {{ network.name }}
          </option>
        </select>
      </header>

      <!-- Wallet Connection -->
      <WalletConnection />

      <!-- Deployment Success (after deploying, before continuing) -->
      <DeploymentSuccess
        v-if="contractStore.deploymentResult"
        :contract-address="contractStore.deploymentResult.contractAddress"
        :spending-key="contractStore.deploymentResult.spendingKey"
        @continue="contractStore.clearDeploymentResult()"
      />

      <!-- Setup Section (when no contract) -->
      <SetupSection v-if="!contractStore.contractAddress && !contractStore.deploymentResult" />

      <!-- Contract Dashboard -->
      <template v-if="contractStore.contractAddress && contractStore.storage">
        <ContractInfo />
        <SpendingLimits />
        <SpenderManagement v-if="contractStore.isOwner" />
        <WithdrawFunds v-if="contractStore.isOwner" />

        <!-- Refresh -->
        <div class="text-center">
          <button
            @click="contractStore.refreshStorage()"
            :disabled="contractStore.isLoading"
            class="btn-secondary flex items-center gap-2 mx-auto"
          >
            <span v-if="contractStore.isLoading" class="spinner spinner-dark"></span>
            Refresh
          </button>
        </div>
      </template>

      <!-- Error -->
      <div v-if="contractStore.error" class="card p-4 mt-5 border border-error/20 bg-error/5">
        <p class="text-sm text-error">{{ contractStore.error }}</p>
      </div>

      <!-- Footer -->
      <footer class="mt-12 text-center">
        <p class="text-sm text-text-muted">
          Built with <a href="https://taquito.io" target="_blank">Taquito</a> · {{ walletStore.currentNetwork.name }}
        </p>
      </footer>

    </div>
  </div>
</template>
