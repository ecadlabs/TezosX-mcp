# TezosX MCP

## Deployment

### 1. MCP Server (Claude Desktop)

Add to your Claude Desktop config (`claude_desktop_config.json`):

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

| Variable | Description |
|----------|-------------|
| `TEZOS_NETWORK` | `mainnet` or `shadownet` |
| `SPENDING_PRIVATE_KEY` | Private key for the spending account |
| `WEB_PORT` | (Optional) Frontend port, default `13205` |

The frontend runs automatically on localhost when the MCP server starts. No separate deployment is required.

### 2. Facilitator

The facilitator verifies and settles x402 payments. Run it on a server accessible to your mint worker.

```bash
cd facilitator
npm install
npm run build
npm start
```

Create `facilitator/.env`:
```
TEZOS_RPC_URL=https://shadownet.tezos.ecadinfra.com
```

### 3. NFT Contract

Deploy the FA2 NFT contract and authorize the minter:

```bash
cd mint
npm install

# Set in .env: TEZOS_RPC_URL, ADMIN_PRIVATE_KEY
npm run deploy -- --minter tz1...minter_address
```

This outputs the `NFT_CONTRACT` address to use in the mint worker.

### 4. NFT Mint Worker (Cloudflare)

Deploy the Cloudflare Worker that mints NFTs via x402:

```bash
cd mint/worker
npm install
wrangler deploy
```

Set secrets via wrangler:
```bash
wrangler secret put TEZOS_RPC_URL        # RPC endpoint
wrangler secret put MINTER_PRIVATE_KEY   # Minter's edsk... key
wrangler secret put NFT_CONTRACT         # KT1... contract address
wrangler secret put PAYMENT_RECIPIENT    # tz1... receives payments
wrangler secret put FACILITATOR_URL      # URL to your facilitator
wrangler secret put PINATA_JWT           # Pinata API JWT for IPFS
```

Configure `wrangler.jsonc`:
```jsonc
{
  "vars": {
    "NETWORK": "mainnet",
    "PAYMENT_AMOUNT": "100000"  // 0.1 XTZ in mutez
  }
}
```