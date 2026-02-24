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
        desc: 'Create a signed x402 payment header without broadcasting. Internal tool.',
        example: 'Create an x402 payment of 500000 mutez to tz1abc...',
      },
      {
        name: 'tezos_parse_x402_requirements',
        desc: 'Parse payment requirements from a 402 response body. Internal tool.',
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
        example: 'Drain the spender address to my account',
      },
      {
        name: 'tezos_reveal_account',
        desc: 'Reveal the spender account on-chain. Internal tool.',
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
  <section class="card mb-5 overflow-hidden">
    <!-- Toggle header -->
    <button
      @click="open = !open"
      class="w-full flex items-center justify-between px-5 py-4 cursor-pointer bg-transparent border-none text-left transition-colors hover:bg-primary-50/50"
    >
      <p class="section-label !mb-0">tool reference</p>
      <svg
        width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
        class="text-text-muted transition-transform duration-200"
        :class="open ? 'rotate-180' : ''"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>

    <!-- Collapsible content -->
    <div
      class="grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
      :class="open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'"
    >
      <div class="overflow-hidden">
        <div class="px-5 pb-5">
          <p class="text-xs text-text-muted mb-4">
            Call tools by asking your AI agent to do things in plain language. Tools marked as internal are automatically called in conjunction with other tools, but can also be called manually.
          </p>

          <div v-for="(group, gi) in toolGroups" :key="group.label" :class="gi > 0 ? 'mt-4' : ''">
            <!-- Group label -->
            <div class="flex items-center gap-2 mb-2">
              <span class="label !mb-0 !text-[11px] uppercase tracking-wider text-text-muted font-medium">{{ group.label }}</span>
              <div class="flex-1 h-px bg-primary-200"></div>
            </div>

            <!-- Tool rows -->
            <div class="space-y-1.5">
              <div
                v-for="tool in group.tools"
                :key="tool.name"
                class="card-subtle px-3 py-2.5 grid grid-cols-[160px_1fr] gap-3 items-baseline sm:grid-cols-[170px_1fr_1fr]"
              >
                <span class="mono text-xs text-accent-600 truncate">{{ tool.name }}</span>
                <span class="text-xs text-text-secondary leading-relaxed">{{ tool.desc }}</span>
                <span class="text-xs text-text-muted italic hidden sm:block">"{{ tool.example }}"</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
