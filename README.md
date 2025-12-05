# TezosX MCP - ALPHA

# Warning: This MCP is in alpha. Most things should work, but please be prepared for troubleshooting. Please report any problems on our issues page.
## As always, verify the output of your LLM before approving any transactions. Set reasonable limits. Trust but verify. 

A Model Context Protocol server for Tezos with x402 payment support.

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/yODwUH?referralCode=SVg46H&utm_medium=integration&utm_source=template&utm_campaign=generic)

## Components

| Component | Description | Deployment |
|-----------|-------------|------------|
| **MCP Server** | Tezos wallet tools for AI agents | Claude Desktop / Railway |
| **Facilitator** | Verifies & settles x402 payments | Cloudflare Worker |
| **Mint Worker** | Mints NFT receipts via x402 | Cloudflare Worker |
| **NFT Contract** | FA2 contract for collector cards | Tezos blockchain |

## Deployment

### 1. MCP Server

**Claude Desktop** - Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "tezosx": {
      "command": "node",
      "args": ["/path/to/TezosX-mcp/mcp/dist/index.js"],
      "env": {
        "TEZOS_NETWORK": "shadownet",
        "SPENDING_CONTRACT": "KT1...",
        "SPENDING_PRIVATE_KEY": "edsk..."
      }
    }
  }
}
```

The server runs in HTTP mode when `MCP_TRANSPORT=http`.

The frontend runs automatically.

| Variable | Description |
|----------|-------------|
| `TEZOS_NETWORK` | `mainnet` (default) or `shadownet` |
| `SPENDING_CONTRACT` | Spending limit contract address |
| `SPENDING_PRIVATE_KEY` | Private key (edsk/spsk/p2sk) |
| `MCP_TRANSPORT` | `stdio` (default) or `http` |
| `WEB_PORT` | Frontend port (default: 13205) |

### 2. Facilitator (Cloudflare Worker)

```bash
cd facilitator
npm install
npm run deploy
```

Configure `wrangler.jsonc`:
```jsonc
{
  "vars": {
    "TEZOS_RPC_URL": "https://shadownet.tezos.ecadinfra.com"
  }
}
```

### 3. NFT Contract

Deploy the FA2 contract and authorize a minter:

```bash
cd mint
npm install
npm run deploy -- --minter tz1...
```

### 4. Mint Worker (Cloudflare Worker)

```bash
cd mint/worker
npm install
npm run deploy
```

Set secrets:
```bash
wrangler secret put TEZOS_RPC_URL
wrangler secret put MINTER_PRIVATE_KEY
wrangler secret put NFT_CONTRACT
wrangler secret put PAYMENT_RECIPIENT
wrangler secret put PINATA_JWT
```

Configure `wrangler.jsonc`:
```jsonc
{
  "vars": {
    "NETWORK": "shadownet",
    "PAYMENT_AMOUNT": "100000"
  },
  "services": [
    { "binding": "FACILITATOR", "service": "tezos-x402-facilitator" }
  ]
}
```

The mint worker uses a service binding to call the facilitator directly (no public URL needed).

## API Endpoints

**Mint Worker** (`/`):
- Returns 402 with payment requirements if no `X-PAYMENT` header
- Verifies payment, mints NFT, returns token details on success

**Facilitator**:
- `POST /verify` - Verify a payment payload
- `POST /settle` - Settle a verified payment
- `GET /health` - Health check
