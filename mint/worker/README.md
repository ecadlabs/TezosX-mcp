# Tezos x402 NFT Minting Worker

A Cloudflare Worker that mints Tezos NFTs when users pay via the x402 protocol. The worker returns `402 Payment Required` until a valid payment is received, then mints an NFT receipt to the payer.

## Features

- x402 payment protocol integration
- FA2-compliant NFT minting via Taquito
- Dynamic SVG receipt generation
- IPFS metadata storage via Pinata
- Automatic payment verification and settlement

## Prerequisites

1. **LIGO compiler** - For compiling the NFT contract
2. **Cloudflare account** - For deploying the worker
3. **Pinata account** - For IPFS uploads ([pinata.cloud](https://pinata.cloud))
4. **Tezos wallet** - Funded account for minting operations

## Setup

### 1. Deploy the FA2 NFT Contract

First, compile and deploy the NFT contract from `../nft.jsligo`:

```bash
# Compile the contract
cd ../
npx ts-node compile.ts

# Deploy using Taquito or octez-client
# Save the contract address (KT1...)
```

### 2. Authorize the Minter

After deploying the NFT contract, add the minter address as an authorized minter:

```typescript
import { TezosToolkit } from "@taquito/taquito";
import { InMemorySigner } from "@taquito/signer";

const Tezos = new TezosToolkit("https://shadownet.tezos.ecadinfra.com");
Tezos.setProvider({
  signer: await InMemorySigner.fromSecretKey("edsk...admin_key"),
});

const contract = await Tezos.contract.at("KT1...nft_contract");
const op = await contract.methods.add_minter("tz1...minter_address").send();
await op.confirmation();
```

### 3. Install Dependencies

```bash
cd worker
npm install
```

### 4. Configure Secrets

Set the required secrets using wrangler:

```bash
# Tezos RPC endpoint
wrangler secret put TEZOS_RPC_URL
# Enter: https://shadownet.tezos.ecadinfra.com (or your preferred RPC)

# Minter's private key (must be authorized on NFT contract)
wrangler secret put MINTER_PRIVATE_KEY
# Enter: edsk...

# NFT contract address
wrangler secret put NFT_CONTRACT
# Enter: KT1...

# Address to receive payments
wrangler secret put PAYMENT_RECIPIENT
# Enter: tz1...

# x402 facilitator URL
wrangler secret put FACILITATOR_URL
# Enter: https://your-facilitator.example.com

# Pinata JWT for IPFS uploads
wrangler secret put PINATA_JWT
# Enter: eyJ...
```

### 5. Configure Variables

Edit `wrangler.jsonc` to set the network and payment amount:

```jsonc
{
  "vars": {
    "NETWORK": "shadownet",      // or "mainnet"
    "PAYMENT_AMOUNT": "100000"  // 0.1 XTZ in mutez
  }
}
```

### 6. Local Development

```bash
npm run dev
```

The worker will be available at `http://localhost:8787`.

### 7. Deploy

```bash
npm run deploy
```

## API

### `GET /mint` or `POST /mint`

Mint an NFT after x402 payment.

**Query Parameters:**
- `recipient` (optional) - Address to receive the NFT (defaults to payer)

**Request Body (POST):**
```json
{
  "recipient": "tz1..." // optional
}
```

**Without Payment (returns 402):**
```json
{
  "x402Version": 1,
  "paymentRequirements": [
    {
      "scheme": "exact-tezos",
      "network": "shadownet",
      "asset": "XTZ",
      "amount": "100000",
      "recipient": "tz1...",
      "extra": {
        "name": "XTZ",
        "decimals": 6
      }
    }
  ]
}
```

**With Valid Payment (returns 200):**
```json
{
  "success": true,
  "nft": {
    "tokenId": 42,
    "contract": "KT1...",
    "recipient": "tz1...",
    "metadataUri": "ipfs://Qm...",
    "opHash": "oo..."
  },
  "payment": {
    "amount": "0.1 XTZ",
    "settled": true
  }
}
```

### `GET /` or `GET /health`

Health check endpoint.

```json
{
  "status": "ok",
  "service": "tezos-x402-nft",
  "network": "shadownet",
  "contract": "KT1..."
}
```

## Testing

### Without Payment (get 402 response)

```bash
curl http://localhost:8787/mint
```

### With Payment Header

```bash
# First, create a signed payment using the MCP tool or manually
# Then include it in the X-PAYMENT header:

curl -X POST http://localhost:8787/mint \
  -H "Content-Type: application/json" \
  -H "X-PAYMENT: eyJ4NDAyVmVyc2lvbiI6MSwi..." \
  -d '{"recipient": "tz1YourAddress..."}'
```

### Using the MCP Tool

If you have the TezosX MCP server running:

```
Use the tezos_fetch_with_x402 tool to fetch https://your-worker.workers.dev/mint
with maxAmountMutez of 100000
```

## Error Codes

| Code | Description |
|------|-------------|
| `NO_PAYMENT` | No X-PAYMENT header provided |
| `INVALID_PAYMENT` | Payment verification failed |
| `WRONG_NETWORK` | Payment network doesn't match configured network |
| `IPFS_UPLOAD_FAILED` | Failed to upload metadata to Pinata |
| `MINT_FAILED` | NFT contract call failed |
| `SETTLE_FAILED` | Payment settlement failed (NFT was still minted) |
| `INVALID_REQUEST` | Malformed request |

## Architecture

```
┌──────────────────┐
│   Client/Agent   │
└────────┬─────────┘
         │ 1. GET /mint
         ▼
┌──────────────────┐
│  Cloudflare      │
│  Worker          │
└────────┬─────────┘
         │ 2. Return 402 with payment requirements
         ▼
┌──────────────────┐
│   Client/Agent   │
└────────┬─────────┘
         │ 3. Sign payment, GET /mint with X-PAYMENT
         ▼
┌──────────────────┐     ┌──────────────────┐
│  Cloudflare      │────▶│   Facilitator    │
│  Worker          │     │   (verify)       │
└────────┬─────────┘     └──────────────────┘
         │ 4. Verified
         │
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
                               ▲
                               │ 6. Background settle
                               │
                         ┌─────┴──────┐
                         │  Worker    │
                         │  (waitUntil)│
                         └────────────┘
```

## License

MIT
