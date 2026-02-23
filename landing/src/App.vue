<script setup lang="ts">
import { ref, onMounted } from 'vue'
import GrainBackground from '@/components/GrainBackground.vue'
import NavBar from '@/components/NavBar.vue'
import HeroSection from '@/components/HeroSection.vue'
import FeaturesSection from '@/components/FeaturesSection.vue'
import InstallSection from '@/components/InstallSection.vue'
import ToolsSection from '@/components/ToolsSection.vue'
import FooterSection from '@/components/FooterSection.vue'

const vis = ref(false)

onMounted(() => {
  setTimeout(() => {
    vis.value = true
  }, 80)
})
</script>

<template>
  <div class="min-h-screen text-text-secondary font-sans relative bg-bg">
    <GrainBackground />
    <div class="relative z-[1]" :class="{ visible: vis }">
      <NavBar />
      <HeroSection />
      <FeaturesSection />
      <InstallSection />
      <ToolsSection />
      <FooterSection />
    </div>
  </div>
</template>
