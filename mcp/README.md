# Tezos Wallet MCP

An MCP (Model Context Protocol) server for Tezos wallet operations. Enables AI assistants like Claude to interact with the Tezos blockchain through a spending-limited wallet contract.

## Installation

```bash
npm install tezosx-mcp
```

Or run directly with npx:

```bash
npx tezosx-mcp
```

## Claude Desktop Configuration

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

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SPENDING_PRIVATE_KEY` | Yes | Private key for the spending account (edsk/spsk/p2sk format) |
| `SPENDING_CONTRACT` | Yes | Address of the spending-limited wallet contract (KT1...) |
| `TEZOS_NETWORK` | No | `mainnet` or `shadownet` (default: `mainnet`) |
| `WEB_PORT` | No | Port for the web dashboard (default: `13205`) |

## Available Tools

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

## Web Dashboard

The MCP server includes a web dashboard for managing the spending wallet. It starts automatically on `http://localhost:13205` (or your configured `WEB_PORT`).

## License

Apache-2.0
