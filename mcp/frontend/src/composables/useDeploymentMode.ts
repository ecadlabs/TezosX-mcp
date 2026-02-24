import { ref, computed } from 'vue'

const isLocal = ref<boolean | null>(null)
const serverNetwork = ref<string | null>(null)
let checkPromise: Promise<void> | null = null

async function detectMode(): Promise<void> {
  if (isLocal.value !== null) return
  if (checkPromise) return checkPromise

  checkPromise = (async () => {
    try {
      const res = await fetch('/api/status')
      // Parse as JSON — if it's an SPA fallback (HTML), this throws
      const data = await res.json()
      isLocal.value = res.ok && typeof data.configured === 'boolean'
      if (data.network) {
        serverNetwork.value = data.network
      }
    } catch {
      isLocal.value = false
    }
  })()

  return checkPromise
}

export function useDeploymentMode() {
  return {
    isLocal,
    isRemote: computed(() => isLocal.value === false),
    ready: computed(() => isLocal.value !== null),
    serverNetwork,
    detectMode,
  }
}
