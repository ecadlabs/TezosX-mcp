<script setup lang="ts">
import { ref } from 'vue'
import CodeBlock from './CodeBlock.vue'

const activeInstall = ref(0)

const paths = [
  { icon: 'terminal', title: 'Local (npx)', tag: 'fastest' },
  { icon: 'cloud', title: 'Self-Hosted', tag: 'always on' },
  { icon: 'globe', title: 'Hosted Dashboard', tag: 'flexible' },
]

const deploymentPlatforms = [
  { name: 'Railway', url: 'https://railway.com/deploy/tezosx-mcp?referralCode=SVg46H&utm_medium=integration&utm_source=template&utm_campaign=generic' },
  { name: 'Render', url: 'https://render.com/deploy?repo=https://github.com/ecadlabs/TezosX-mcp' }
]

const codeLocal = `{
  "mcpServers": {
    "tezos": {
      "command": "npx",
      "args": ["-y", "@ecadlabs/tezosx-mcp"]
    }
  }
}`

const codeLocalWithRemoteDashboard = `{
  "mcpServers": {
    "tezos": {
      "command": "npx",
      "args": ["-y", "@ecadlabs/tezosx-mcp"],
      "env": { 
        "CONTRACT_ADDRESS: "KT1...",
        "SPENDING_PRIVATE_KEY: "edsk...""
      }
    }
  }
}`

const codeEnv = `SPENDING_PRIVATE_KEY=edsk...
SPENDING_CONTRACT=KT1...`

const codeSelfHosted = `{
  "mcpServers": {
    "tezos": {
      "type": "streamable-http",
      "url": "https://your-mcp-url.example.com"
    }
  }
}`
</script>

<template>
  <section id="install" class="max-w-[1100px] mx-auto px-7 pt-[60px] pb-[70px] border-t border-border">
    <div class="text-center mb-11">
      <h2 class="text-4xl font-bold tracking-[-0.04em] text-text-primary">Installation</h2>
    </div>

    <div class="grid grid-cols-[300px_1fr] gap-4 min-h-[400px] max-md:grid-cols-1">
      <!-- Path selectors -->
      <div class="flex flex-col gap-2 max-md:flex-row max-md:overflow-x-auto">
        <button v-for="(p, i) in paths" :key="p.title" :class="[
          'border rounded-[10px] px-5 py-[18px] cursor-pointer text-left transition-all duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)] max-md:min-w-[160px]',
          activeInstall === i
            ? 'bg-accent/[0.08] border-accent/25 scale-[1.02]'
            : 'bg-white/[0.015] border-white/[0.04] scale-100'
        ]" @click="activeInstall = i">
          <div class="flex items-center gap-2.5 mb-1">
            <span class="flex transition-colors duration-300"
              :class="activeInstall === i ? 'text-accent' : 'text-text-dim'">
              <svg v-if="p.icon === 'terminal'" width="22" height="22" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="4 17 10 11 4 5" />
                <line x1="12" y1="19" x2="20" y2="19" />
              </svg>
              <svg v-if="p.icon === 'cloud'" width="22" height="22" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
              </svg>
              <svg v-if="p.icon === 'globe'" width="22" height="22" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </span>
            <span class="text-[15px] font-semibold transition-colors duration-300"
              :class="activeInstall === i ? 'text-accent' : 'text-neutral-400'">{{ p.title }}</span>
          </div>
          <span class="font-mono text-[11px] uppercase tracking-[0.04em]"
            :class="activeInstall === i ? 'text-accent/60' : 'text-text-faint'">{{ p.tag }}</span>
        </button>
      </div>

      <!-- Guide content -->
      <div class="bg-white/[0.015] border border-border rounded-xl px-[26px] py-7">
        <!-- Local -->
        <div v-if="activeInstall === 0" class="flex flex-col gap-[26px]">
          <p class="text-[#888] text-[14.5px] leading-[1.7]">
            The quickest path. Run the MCP locally alongside Claude Desktop — a built-in
            dashboard handles all configuration automatically.
          </p>
          <div class="flex gap-3.5 items-start">
            <div
              class="w-[26px] h-[26px] rounded-full shrink-0 flex items-center justify-center font-mono text-xs font-semibold transition-all duration-300 bg-accent/[0.12] text-accent">
              1
            </div>
            <div class="flex-1">
              <p class="text-text-secondary text-sm font-medium mb-2">Add to your Claude Desktop config</p>
              <CodeBlock label="claude_desktop_config.json" :code="codeLocal" />
            </div>
          </div>
          <div class="flex gap-3.5 items-start">
            <div
              class="w-[26px] h-[26px] rounded-full shrink-0 flex items-center justify-center font-mono text-xs font-semibold transition-all duration-300 bg-accent/[0.12] text-accent">
              2
            </div>
            <div class="flex-1">
              <p class="text-text-secondary text-sm font-medium mb-2">Restart Claude Desktop</p>
              <p class="text-text-muted text-[13px] leading-[1.6]">
                Open your dashboard at
                <code
                  class="font-mono text-xs px-1.5 py-0.5 rounded transition-all duration-300 text-accent bg-accent/[0.08]">localhost:13205</code>.
                Or ask Claude for the link.
              </p>
            </div>
          </div>
          <div class="flex gap-3.5 items-start">
            <div
              class="w-[26px] h-[26px] rounded-full shrink-0 flex items-center justify-center font-mono text-xs font-semibold transition-all duration-300 bg-accent/[0.12] text-accent">
              3
            </div>
            <div class="flex-1">
              <p class="text-text-secondary text-sm font-medium mb-2">Deploy your spending contract</p>
              <p class="text-text-muted text-[13px] leading-[1.6]">
                Connect your wallet, deploy the spending contract, and set your spending limits. Everything else is
                handled for you.
              </p>
            </div>
          </div>
        </div>

        <!-- Self-Hosted -->
        <div v-if="activeInstall === 1" class="flex flex-col gap-[26px]">
          <p class="text-[#888] text-[14.5px] leading-[1.7]">
            Deploy on Railway or Render for a remote MCP that's still entirely under your control and accessible from
            mutliple clients. Requires some manual
            configuration.
          </p>
          <div class="flex gap-3.5 items-start">
            <div
              class="w-[26px] h-[26px] rounded-full shrink-0 flex items-center justify-center font-mono text-xs font-semibold transition-all duration-300 bg-accent/[0.12] text-accent">
              1
            </div>
            <div class="flex-1">
              <p class="text-text-secondary text-sm font-medium mb-2">One-click deploy</p>
              <div class="flex gap-2.5 max-md:flex-col">
                <a v-for="p in deploymentPlatforms" :key="p.name" :href="p.url" target="_blank"
                  class="bg-white/5 border border-white/[0.08] rounded-md px-[18px] py-[9px] text-neutral-300 cursor-pointer font-sans text-[13px] font-medium">
                  Deploy on {{ p.name }} →
                </a>
              </div>
            </div>
          </div>
          <div class="flex gap-3.5 items-start">
            <div
              class="w-[26px] h-[26px] rounded-full shrink-0 flex items-center justify-center font-mono text-xs font-semibold transition-all duration-300 bg-accent/[0.12] text-accent">
              2
            </div>
            <div class="flex-1">
              <p class="text-text-secondary text-sm font-medium mb-2">Open dashboard &amp; deploy contract</p>
              <p class="text-text-muted text-[13px] leading-[1.6]">
                Visit your deployment URL, Connect your wallet, deploy the spending contract, and set your spending
                limits. Copy the provided spending key and contract address.
              </p>
            </div>
          </div>
          <div class="flex gap-3.5 items-start">
            <div
              class="w-[26px] h-[26px] rounded-full shrink-0 flex items-center justify-center font-mono text-xs font-semibold transition-all duration-300 bg-accent/[0.12] text-accent">
              3
            </div>
            <div class="flex-1">
              <p class="text-text-secondary text-sm font-medium mb-2">Set environment variables on your server</p>
              <CodeBlock label="platform environment" :code="codeEnv" />
            </div>
          </div>
          <div class="flex gap-3.5 items-start">
            <div
              class="w-[26px] h-[26px] rounded-full shrink-0 flex items-center justify-center font-mono text-xs font-semibold transition-all duration-300 bg-accent/[0.12] text-accent">
              4
            </div>
            <div class="flex-1">
              <p class="text-text-secondary text-sm font-medium mb-2">Point Claude at your MCP</p>
              <CodeBlock label="claude_desktop_config.json" :code="codeSelfHosted" />
            </div>
          </div>
        </div>

        <!-- Hosted -->
        <div v-if="activeInstall === 2" class="flex flex-col gap-[26px]">
          <p class="text-[#888] text-[14.5px] leading-[1.7]">
            Use our hosted dashboard to deploy your contract and generate keys, but run the MCP server locally. Keys
            never leave your browser.
          </p>
          <div class="flex gap-3.5 items-start">
            <div
              class="w-[26px] h-[26px] rounded-full shrink-0 flex items-center justify-center font-mono text-xs font-semibold transition-all duration-300 bg-accent/[0.12] text-accent">
              1
            </div>
            <div class="flex-1">
              <p class="text-text-secondary text-sm font-medium mb-2">Open the hosted dashboard</p>
              <a href="https://7687adbb.tezosx-dashboard.pages.dev/" target="_blank"
                class="border border-accent/20 bg-accent/10 rounded-md px-5 py-2.5 cursor-pointer font-sans text-[13px] font-semibold text-accent transition-all duration-300">
                Open Dashboard →
              </a>
            </div>
          </div>
          <div class="flex gap-3.5 items-start">
            <div
              class="w-[26px] h-[26px] rounded-full shrink-0 flex items-center justify-center font-mono text-xs font-semibold transition-all duration-300 bg-accent/[0.12] text-accent">
              2
            </div>
            <div class="flex-1">
              <p class="text-text-secondary text-sm font-medium mb-2">Deploy contract &amp; copy credentials</p>
              <p class="text-text-muted text-[13px] leading-[1.6]">Connect your wallet, deploy the spending contract, and set your spending
                limits. Copy the provided spending key and contract address.</p>
            </div>
          </div>
          <div class="flex gap-3.5 items-start">
            <div
              class="w-[26px] h-[26px] rounded-full shrink-0 flex items-center justify-center font-mono text-xs font-semibold transition-all duration-300 bg-accent/[0.12] text-accent">
              3
            </div>
            <div class="flex-1">
              <p class="text-text-secondary text-sm font-medium mb-2">Add your copied variables to your Claude Config</p>
              <CodeBlock label="claude_desktop_config.json" :code="codeLocalWithRemoteDashboard" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
