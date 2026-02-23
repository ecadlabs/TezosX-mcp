<script setup lang="ts">
import ToolTag from './ToolTag.vue'

const tools = [
  'tezos_send_xtz',
  'tezos_get_balance',
  'tezos_fetch_with_x402',
  'tezos_create_x402_payment',
  'tezos_get_limits',
  'tezos_get_operation_history',
  'tezos_get_addresses',
  'tezos_reveal_account',
  'tezos_get_dashboard',
  'tezos_parse_x402_requirements',
]
</script>

<template>
  <section id="tools" class="max-w-[1100px] mx-auto px-7 pt-[60px] pb-[70px] border-t border-border">
    <div class="text-center mb-11">
      <h2 class="text-4xl font-bold tracking-[-0.04em] text-text-primary">Available Tools</h2>
    </div>
    <div class="flex flex-wrap gap-2 justify-center">
      <ToolTag v-for="name in tools" :key="name" :name="name" />
    </div>
  </section>
</template>
