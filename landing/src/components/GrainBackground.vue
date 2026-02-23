<template>
  <div class="absolute inset-0 pointer-events-none z-0 h-full">
    <div class="absolute inset-0 opacity-[0.03] grain-noise" />
    <div class="absolute inset-0 bg-[linear-gradient(145deg,rgba(20,184,166,0.05)_0%,transparent_50%)] transition-[background] duration-500" />
  </div>
</template>

<style scoped>
.grain-noise {
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.5' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
}
</style>
