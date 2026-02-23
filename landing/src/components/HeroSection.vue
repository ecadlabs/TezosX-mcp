<script setup lang="ts">
import { ref } from 'vue'

const npxCopied = ref(false)

function copyNpx() {
  navigator.clipboard?.writeText('npx @ecadlabs/tezosx-mcp')
  npxCopied.value = true
  setTimeout(() => {
    npxCopied.value = false
  }, 2000)
}
</script>

<template>
  <section class="max-w-[1100px] mx-auto px-7 pt-[90px] pb-[70px] text-center max-md:px-5 max-md:pt-[60px] max-md:pb-[50px]">
    <div class="animate-fade-up [animation-delay:0.1s]">
      <h1 class="text-[clamp(42px,6vw,72px)] font-bold leading-[1.05] mb-6 tracking-[-0.04em] text-text-primary">Tezos tools for<br />AI agents</h1>
    </div>
    <p class="animate-fade-up [animation-delay:0.25s] text-[clamp(16px,1.8vw,19px)] leading-[1.7] text-text-muted max-w-[540px] mx-auto mb-[38px]">
      An MCP server that lets Claude send XTZ, make x402 payments, and interact with Tezos —
      secured by on-chain spending limits.
    </p>
    <div class="animate-fade-up [animation-delay:0.4s] flex gap-3 justify-center flex-wrap">
      <a href="#install" class="btn-primary bg-accent">
        Get Started
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="rotate-90"
        >
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </a>
    </div>
  </section>
</template>
