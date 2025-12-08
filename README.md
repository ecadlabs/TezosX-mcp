# TezosX MCP - ALPHA

# Warning: This MCP is in alpha. Most things should work, but please be prepared for troubleshooting. Please report any problems on our issues page.
## As always, verify the output of your LLM before approving any transactions. Set reasonable limits. Trust but verify. 

A Model Context Protocol server for Tezos with x402 payment support.

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/tezosx-mcp?referralCode=SVg46H&utm_medium=integration&utm_source=template&utm_campaign=generic)
<details>
<summary>Deploying on Railway</summary>

1. Deploy the template (if you'd like to use shadownet, set the "TEZOS_NETWORK" variable to `shadownet` before clicking deploy)
2. Click the deployed item and go to "Settings"
3. Scroll down to "Public Networking"
4. Your domain will be something like `tezosx-mcp-production-a12b.up.railway.app`
5. Navigate to your domain to open the frontend config, and set up your spending key and contract address.
6. Back on Railway, navigate to the "Variables" tab and set `SPENDING_PRIVATE_KEY` and `SPENDING_CONTRACT` to the values you just received.
7. Optional: Enable the 'serverless' setting to reduce resource usage.
8. Restart the deployment.
9. Set up your AI Platform to use `[your domain]/mcp` as the URL
</details>


[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/ecadlabs/TezosX-mcp)
<details>
<summary>Deploying on Render</summary>

1. Click the button above to deploy the template
2. Once deployed, under the "Sync" click "View details"
3. Click the hyperlink to "tezosx-mcp"
4. Navigate to your onrender.com custom url near the top and set up your spending key and contract address.
5. Back on Render, navigate to the "Environment" tab on the left and set `SPENDING_PRIVATE_KEY` and `SPENDING_CONTRACT` environment variables to the values you just received.
7. Click "Manual deploy" at the top right and select "Restart service".
8. Set up your AI Platform to use `[your domain]/mcp` as the URL

Please note that Render spins down free plan services during periods of inactivity. If this happens, your LLM's next request can take up to a minute while the instance spins back up automatically. You can upgrade to a paid Render plan to avoid this.
</details>

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
