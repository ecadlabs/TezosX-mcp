# Tezos x402 Facilitator

A Cloudflare Worker that verifies and settles x402 payments using the `exact-tezos` scheme.

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

## Deploy

```bash
npm run deploy
```

## Configuration

Set `TEZOS_RPC_URL` in `wrangler.jsonc` (defaults to shadownet).

## API

### GET /health

Returns service status and connected block.

### POST /verify

Validates a payment payload against requirements. Returns `{ valid: true }` or `{ valid: false, reason: "..." }`.

### POST /settle

Injects a verified payment to the Tezos network. Returns `{ success: true, operationHash: "..." }`.

## Notes

- In-memory double-spend protection resets on deployment
- Only supports `exact-tezos` scheme with `XTZ`
- Operations must be verified before settlement
