<script setup lang="ts">
import FeatureCard from './FeatureCard.vue'

const features = [
  {
    icon: 'shield',
    title: 'On-Chain Limits',
    desc: "Smart contract enforces daily and per-tx caps. Even a compromised MCP can't exceed them.",
  },
  {
    icon: 'zap',
    title: 'x402 Payments',
    desc: 'Native HTTP 402 payment protocol. Pay for APIs, mint NFTs, and make HTTP transactions via your agent.',
  },
  {
    icon: 'key',
    title: 'Key Isolation',
    desc: 'Separate spending key for the agent. Rotate it instantly from the dashboard if compromised, you never have to share your private key.',
  },
]
</script>

<template>
  <section class="max-w-[1100px] mx-auto px-7 pt-[30px] pb-[70px] max-md:px-5 max-md:pt-5 max-md:pb-[50px]">
    <div class="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3.5">
      <FeatureCard
        v-for="(f, i) in features"
        :key="f.title"
        :icon="f.icon"
        :title="f.title"
        :desc="f.desc"
        class="animate-fade-up"
        :style="{ animationDelay: `${0.5 + i * 0.08}s` }"
      />
    </div>
  </section>
</template>
