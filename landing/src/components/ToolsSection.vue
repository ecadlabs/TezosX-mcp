<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)

const toolGroups = [
  {
    label: 'Wallet',
    tools: [
      {
        name: 'tezos_get_balance',
        desc: 'Check the balance of your spending contract and spender address.',
        example: 'What\'s my balance?',
      },
      {
        name: 'tezos_send_xtz',
        desc: 'Send XTZ to any Tezos address via your spending contract.',
        example: 'Send 5 XTZ to tz1abc...',
      },
      {
        name: 'tezos_get_limits',
        desc: 'View daily and per-transaction spending limits, and how much has been used today.',
        example: 'What are my spending limits?',
      },
      {
        name: 'tezos_get_addresses',
        desc: 'Get the contract, owner, and spender addresses.',
        example: 'Show me my Tezos addresses',
      },
      {
        name: 'tezos_get_operation_history',
        desc: 'View recent transaction history for the spending contract.',
        example: 'Show my recent transactions',
      },
    ],
  },
  {
    label: 'x402 Payments',
    tools: [
      {
        name: 'tezos_fetch_with_x402',
        desc: 'Fetch a URL and automatically pay if it requires an x402 payment.',
        example: 'Fetch https://api.example.com/paid-endpoint with a max of 0.5 XTZ',
      },
      {
        name: 'tezos_create_x402_payment',
        desc: 'Create a signed x402 payment header without broadcasting.',
        example: 'Create an x402 payment of 500000 mutez to tz1abc...',
      },
      {
        name: 'tezos_parse_x402_requirements',
        desc: 'Parse payment requirements from a 402 response body.',
        example: 'Parse these x402 payment requirements',
      },
    ],
  },
  {
    label: 'Account',
    tools: [
      {
        name: 'tezos_recover_spender_funds',
        desc: 'Transfer the spender address\'s XTZ balance back to the owner.',
        example: 'Recover funds from the spender address',
      },
      {
        name: 'tezos_reveal_account',
        desc: 'Reveal the spender account on-chain. Required before first use.',
        example: 'Reveal my account',
      },
      {
        name: 'tezos_get_dashboard',
        desc: 'Get a link to the configuration dashboard.',
        example: 'Open the dashboard',
      },
    ],
  },
]
</script>

<template>
  <section id="tools" class="max-w-[1100px] mx-auto px-7 pt-[60px] pb-[70px] border-t border-border max-md:px-5">
    <!-- Header with toggle -->
    <div class="text-center mb-8">
      <h2 class="text-4xl font-bold tracking-[-0.04em] text-text-primary mb-3">Available Tools</h2>
      <p class="text-text-muted text-[14.5px] leading-[1.7] max-w-[520px] mx-auto">
        Your agent gets access to {{ toolGroups.reduce((n, g) => n + g.tools.length, 0) }} tools.
        Ask in plain language — the LLM picks the right one.
      </p>
    </div>

    <!-- Collapsible toggle -->
    <button
      @click="open = !open"
      class="mx-auto flex items-center gap-2 px-5 py-2.5 rounded-lg border transition-all duration-300 cursor-pointer font-sans text-[13px] font-medium"
      :class="open
        ? 'bg-accent/[0.08] border-accent/25 text-accent'
        : 'bg-white/[0.03] border-white/[0.06] text-text-muted hover:border-white/[0.12] hover:text-text-secondary'"
    >
      <svg
        width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
        class="transition-transform duration-300"
        :class="open ? 'rotate-90' : ''"
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
      {{ open ? 'Hide tool reference' : 'Show tool reference' }}
    </button>

    <!-- Collapsible content -->
    <div
      class="grid transition-[grid-template-rows] duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]"
      :class="open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'"
    >
      <div class="overflow-hidden">
        <div class="pt-8 flex flex-col gap-7">
          <div v-for="group in toolGroups" :key="group.label">
            <!-- Group label -->
            <div class="flex items-center gap-3 mb-3.5">
              <span class="font-mono text-[11px] uppercase tracking-[0.06em] text-text-faint">{{ group.label }}</span>
              <div class="flex-1 h-px bg-white/[0.04]"></div>
            </div>

            <!-- Tool rows -->
            <div class="flex flex-col gap-2">
              <div
                v-for="tool in group.tools"
                :key="tool.name"
                class="grid grid-cols-[200px_1fr_1fr] gap-4 items-baseline px-4 py-3 rounded-lg bg-white/[0.015] border border-white/[0.03] max-md:grid-cols-1 max-md:gap-1.5"
              >
                <span class="font-mono text-[12.5px] text-accent/80">{{ tool.name }}</span>
                <span class="text-[13px] text-text-dim leading-[1.5]">{{ tool.desc }}</span>
                <span class="text-[12.5px] text-text-faint italic max-md:pl-0">
                  "{{ tool.example }}"
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
