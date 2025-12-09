# TezosX MCP

A Model Context Protocol server for Tezos with x402 payment support.

> **Warning:** This MCP is in alpha. Most things should work, but please be prepared for troubleshooting. Please report any problems on our [issues page](https://github.com/ecadlabs/TezosX-mcp/issues).
>
> As always, verify the output of your LLM before approving any transactions. Set reasonable limits. Trust but verify.

## Quick Deploy

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/tezosx-mcp?referralCode=SVg46H&utm_medium=integration&utm_source=template&utm_campaign=generic)
<details>
<summary>Railway deployment steps</summary>

1. Deploy the template (set `TEZOS_NETWORK` to `shadownet` before clicking deploy if desired)
2. Click the deployed item and go to "Settings"
3. Scroll down to "Public Networking"
4. Your domain will be something like `tezosx-mcp-production-a12b.up.railway.app`
5. Navigate to your domain to open the frontend config, and set up your spending key and contract address
6. Back on Railway, navigate to the "Variables" tab and set `SPENDING_PRIVATE_KEY` and `SPENDING_CONTRACT` to the values you received
7. Optional: Enable the 'serverless' setting to reduce resource usage
8. Restart the deployment
9. Set up your AI Platform to use `[your domain]/mcp` as the URL

</details>

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/ecadlabs/TezosX-mcp)

<details>
<summary>Render deployment steps</summary>

1. Click the button above to deploy the template
2. Once deployed, under "Sync" click "View details"
3. Click the hyperlink to "tezosx-mcp"
4. Navigate to your onrender.com custom URL and set up your spending key and contract address
5. Back on Render, navigate to the "Environment" tab and set `SPENDING_PRIVATE_KEY` and `SPENDING_CONTRACT` environment variables
6. Click "Manual deploy" at the top right and select "Restart service"
7. Set up your AI Platform to use `[your domain]/mcp` as the URL

Note: Render spins down free plan services during inactivity. The next request can take up to a minute while the instance spins back up. Upgrade to a paid plan to avoid this.

</details>

## Components

| Component | Description | Deployment |
|-----------|-------------|------------|
| **MCP Server** | Tezos wallet tools for AI agents | Claude Desktop / Railway / Render |
| **Facilitator** | Verifies & settles x402 payments | Cloudflare Worker |
| **Mint Worker** | Mints NFT receipts via x402 | Cloudflare Worker |
| **NFT Contract** | FA2 contract for collector cards | Tezos blockchain |

---

## MCP Server

### Installation

```bash
npm install tezosx-mcp
```

Or run directly:

```bash
npx tezosx-mcp
```

### Claude Desktop Configuration

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "tezos": {
      "command": "npx",
      "args": ["tezosx-mcp"],
      "env": {
        "TEZOS_NETWORK": "mainnet",
        "SPENDING_CONTRACT": "KT1...",
        "SPENDING_PRIVATE_KEY": "edsk..."
      }
    }
  }
}
```

Or run from source:

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

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SPENDING_PRIVATE_KEY` | Yes | Private key for the spending account (edsk/spsk/p2sk format) |
| `SPENDING_CONTRACT` | Yes | Address of the spending-limited wallet contract (KT1...) |
| `TEZOS_NETWORK` | No | `mainnet` (default) or `shadownet` |
| `MCP_TRANSPORT` | No | `stdio` (default) or `http` |
| `WEB_PORT` | No | Frontend port (default: 13205) |

### Available Tools

| Tool | Description |
|------|-------------|
| `get_balance` | Get the balance of the spending wallet |
| `get_addresses` | Get addresses associated with the spending contract |
| `get_limits` | Get current spending limits and allowances |
| `get_operation_history` | Get recent operations from the wallet |
| `get_dashboard` | Open the web dashboard for wallet management |
| `send_xtz` | Send XTZ from the spending wallet |
| `reveal_account` | Reveal an unrevealed account on-chain |
| `create_x402_payment` | Create an x402 payment header |
| `fetch_with_x402` | Fetch a URL with x402 payment |
| `parse_x402_requirements` | Parse x402 payment requirements from a response |

### Web Dashboard

The MCP server includes a web dashboard for managing the spending wallet. It starts automatically on `http://localhost:13205` (or your configured `WEB_PORT`).

---

## Facilitator (Cloudflare Worker)

A Cloudflare Worker that verifies and settles x402 payments using the `exact-tezos` scheme.

### Deploy

```bash
cd facilitator
npm install
npm run deploy
```

### Configuration

Set `TEZOS_RPC_URL` in `wrangler.jsonc`:

```jsonc
{
  "vars": {
    "TEZOS_RPC_URL": "https://shadownet.tezos.ecadinfra.com"
  }
}
```

### API

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Returns service status and connected block |
| `POST /verify` | Validates a payment payload. Returns `{ valid: true }` or `{ valid: false, reason: "..." }` |
| `POST /settle` | Injects a verified payment to the network. Returns `{ success: true, operationHash: "..." }` |

**Notes:**
- In-memory double-spend protection resets on deployment
- Only supports `exact-tezos` scheme with `XTZ`
- Operations must be verified before settlement

---

## NFT Contract

Deploy the FA2 contract and authorize a minter:

```bash
cd mint
npm install
npm run deploy -- --minter tz1...
```

---

## Mint Worker (Cloudflare Worker)

A Cloudflare Worker that mints Tezos NFTs when users pay via the x402 protocol. Returns `402 Payment Required` until a valid payment is received, then mints an NFT receipt to the payer.

### Features

- x402 payment protocol integration
- FA2-compliant NFT minting via Taquito
- Dynamic SVG receipt generation
- IPFS metadata storage via Pinata

### Prerequisites

1. **LIGO compiler** - For compiling the NFT contract
2. **Cloudflare account** - For deploying the worker
3. **Pinata account** - For IPFS uploads ([pinata.cloud](https://pinata.cloud))
4. **Tezos wallet** - Funded account for minting operations

### Deploy

```bash
cd mint/worker
npm install
npm run deploy
```

### Secrets

```bash
wrangler secret put TEZOS_RPC_URL      # e.g., https://shadownet.tezos.ecadinfra.com
wrangler secret put MINTER_PRIVATE_KEY # edsk...
wrangler secret put NFT_CONTRACT       # KT1...
wrangler secret put PAYMENT_RECIPIENT  # tz1...
wrangler secret put PINATA_JWT         # eyJ...
```

### Configuration

Edit `wrangler.jsonc`:

```jsonc
{
  "vars": {
    "NETWORK": "shadownet",
    "PAYMENT_AMOUNT": "100000"  // 0.1 XTZ in mutez
  },
  "services": [
    { "binding": "FACILITATOR", "service": "tezos-x402-facilitator" }
  ]
}
```

The mint worker uses a service binding to call the facilitator directly (no public URL needed).

### API

**`GET /mint` or `POST /mint`** - Mint an NFT after x402 payment

Query Parameters:
- `recipient` (optional) - Address to receive the NFT (defaults to payer)

Without payment (returns 402):
```json
{
  "x402Version": 1,
  "paymentRequirements": [{
    "scheme": "exact-tezos",
    "network": "shadownet",
    "asset": "XTZ",
    "amount": "100000",
    "recipient": "tz1..."
  }]
}
```

With valid payment (returns 200):
```json
{
  "success": true,
  "nft": {
    "tokenId": 42,
    "contract": "KT1...",
    "recipient": "tz1...",
    "metadataUri": "ipfs://Qm...",
    "opHash": "oo..."
  }
}
```

**`GET /` or `GET /health`** - Health check

### Error Codes

| Code | Description |
|------|-------------|
| `NO_PAYMENT` | No X-PAYMENT header provided |
| `INVALID_PAYMENT` | Payment verification failed |
| `WRONG_NETWORK` | Payment network doesn't match |
| `IPFS_UPLOAD_FAILED` | Failed to upload metadata to Pinata |
| `MINT_FAILED` | NFT contract call failed |
| `SETTLE_FAILED` | Payment settlement failed |

---

## Architecture

```
┌──────────────────┐
│   Client/Agent   │
└────────┬─────────┘
         │ 1. GET /mint
         ▼
┌──────────────────┐
│  Mint Worker     │
└────────┬─────────┘
         │ 2. Return 402 with payment requirements
         ▼
┌──────────────────┐
│   Client/Agent   │
└────────┬─────────┘
         │ 3. Sign payment, retry with X-PAYMENT header
         ▼
┌──────────────────┐     ┌──────────────────┐
│  Mint Worker     │────▶│   Facilitator    │
└────────┬─────────┘     │   (verify)       │
         │               └──────────────────┘
         │ 4. Verified
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌────────┐
│ Pinata │ │ Tezos  │
│ (IPFS) │ │ (mint) │
└────────┘ └────────┘
         │
         │ 5. Return NFT details
         ▼
┌──────────────────┐     ┌──────────────────┐
│   Client/Agent   │     │   Facilitator    │
└──────────────────┘     │   (settle)       │
                         └──────────────────┘
```

## License

Apache-2.0
