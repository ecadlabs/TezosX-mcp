# TezosX MCP

A Model Context Protocol server for Tezos with x402 payment support.

> **Warning:** This MCP is in beta. Most things should work, but please be prepared for troubleshooting. Please report any problems on our [issues page](https://github.com/ecadlabs/TezosX-mcp/issues).
>
> As always, verify the output of your LLM before approving any transactions. Set reasonable limits. Trust but verify.

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

<details>
<summary><strong>Local (npx)</strong> — fastest</summary>

The quickest path. Run the MCP locally alongside Claude Desktop — a built-in dashboard handles all configuration automatically.

1. **Add to your Claude Desktop config** (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

   ```json
   {
     "mcpServers": {
       "tezos": {
         "command": "npx",
         "args": ["-y", "@ecadlabs/tezosx-mcp"]
       }
     }
   }
   ```

2. **Restart Claude Desktop.** Open your dashboard at `localhost:13205`, or ask Claude for the link.

3. **Deploy your spending contract.** Connect your wallet, deploy the spending contract, and set your spending limits. Everything else is handled for you.

</details>

<details>
<summary><strong>Self-Hosted</strong> — always on</summary>

Deploy on Railway or Render for a remote MCP that's still entirely under your control and accessible from multiple clients. Requires some manual configuration.

1. **One-click deploy:**

   [![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/tezosx-mcp?referralCode=SVg46H&utm_medium=integration&utm_source=template&utm_campaign=generic)

   [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/ecadlabs/TezosX-mcp)

2. **Open dashboard & deploy contract.** Visit your deployment URL, connect your wallet, deploy the spending contract, and set your spending limits. Copy the provided spending key and contract address.

3. **Set environment variables on your server:**

   ```
   SPENDING_PRIVATE_KEY=edsk...
   SPENDING_CONTRACT=KT1...
   ```

4. **Point Claude at your MCP:**

   ```json
   {
     "mcpServers": {
       "tezos": {
         "type": "streamable-http",
         "url": "https://your-mcp-url.example.com"
       }
     }
   }
   ```

</details>

<details>
<summary><strong>Hosted Dashboard</strong> — flexible</summary>

Use our hosted dashboard to deploy your contract and generate keys, but run the MCP server locally. Keys never leave your browser.

1. **Open the [hosted dashboard](https://7687adbb.tezosx-dashboard.pages.dev/).**

2. **Deploy contract & copy credentials.** Connect your wallet, deploy the spending contract, and set your spending limits. Copy the provided spending key and contract address.

3. **Add your copied variables to your Claude config:**

   ```json
   {
     "mcpServers": {
       "tezos": {
         "command": "npx",
         "args": ["-y", "@ecadlabs/tezosx-mcp"],
         "env": {
           "CONTRACT_ADDRESS": "KT1...",
           "SPENDING_PRIVATE_KEY": "edsk...",
         }
       }
     }
   }
   ```

</details>

<details>
<summary><strong>From source</strong></summary>

1. Clone the TezosX-mcp repository
2. In the `/TezosX-mcp/mcp` folder run `npm i && npm run build`

```json
{
  "mcpServers": {
    "tezosx": {
      "command": "node",
      "args": ["/path/to/TezosX-mcp/mcp/dist/index.js"]
    }
  }
}
```

</details>

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
