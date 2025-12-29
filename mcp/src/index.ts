#!/usr/bin/env node
export const DEFAULT_WEB_PORT = '13205';

import { config } from 'dotenv';
// Taquito
import { InMemorySigner } from "@taquito/signer";
import { TezosToolkit } from "@taquito/taquito";

// MCP
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createTools } from "./tools/index.js";

// MCP hosted
import express from 'express';

// Webserver
import { startWebServer } from "./webserver.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { fileURLToPath } from "url";
import { join } from "path";

config({ quiet: true });
const __dirname = fileURLToPath(new URL(".", import.meta.url));

// Global error handlers
process.on('uncaughtException', (err) => {
	console.error('[tezosx-mcp] Uncaught exception:', err);
});
process.on('unhandledRejection', (reason) => {
	console.error('[tezosx-mcp] Unhandled rejection:', reason);
});

// Wallet configuration type (null when not configured)
export type WalletConfig = {
	Tezos: TezosToolkit;
	spendingContract: string;
	spendingAddress: string;
} | null;

// Network configurations
const NETWORKS = {
	mainnet: {
		rpcUrl: 'https://mainnet.tezos.ecadinfra.com',
		tzktApi: 'https://api.tzkt.io',
	},
	shadownet: {
		rpcUrl: 'https://shadownet.tezos.ecadinfra.com',
		tzktApi: 'https://api.shadownet.tzkt.io',
	},
} as const;

type NetworkName = keyof typeof NETWORKS;

const log = (msg: string) => console.error(`[tezosx-mcp] ${msg}`);

const init = async () => {
	log('Starting server...');

	// Start web server for frontend (skip if SKIP_FRONTEND is set or if using HTTP transport)
	const skipFrontend = process.env.SKIP_FRONTEND === 'true' || process.env.MCP_TRANSPORT === 'http';
	if (!skipFrontend) {
		const webPort = parseInt(process.env.WEB_PORT || DEFAULT_WEB_PORT, 10);
		startWebServer(webPort);
		log(`Frontend server started on port ${webPort}`);
	}

	const server = new McpServer({
		name: "tezosx-mcp",
		version: "1.0.0"
	});

	// Network configuration
	const networkName = (process.env.TEZOS_NETWORK || 'mainnet') as NetworkName;
	const network = NETWORKS[networkName];
	if (!network) {
		throw new ReferenceError(`Invalid network: ${networkName}. Valid options: ${Object.keys(NETWORKS).join(', ')}`);
	}
	log(`Network: ${networkName}`);

	// Taquito setup
	const Tezos = new TezosToolkit(network.rpcUrl);

	// Wallet configuration (optional - tools will guide user to configure if not set)
	let walletConfig: WalletConfig = null;
	const privateKey = process.env.SPENDING_PRIVATE_KEY?.trim();
	const spendingContract = process.env.SPENDING_CONTRACT?.trim();

	if (privateKey && spendingContract) {
		log('Configuring wallet...');
		// Validate private key format
		if (!privateKey.startsWith('edsk') && !privateKey.startsWith('spsk') && !privateKey.startsWith('p2sk')) {
			log(`Warning: Invalid SPENDING_PRIVATE_KEY format. Must start with edsk, spsk, or p2sk. Wallet not configured.`);
		} else {
			try {
				const signer = await InMemorySigner.fromSecretKey(privateKey);
				Tezos.setSignerProvider(signer);
				const spendingAddress = await Tezos.signer.publicKeyHash();
				walletConfig = { Tezos, spendingContract, spendingAddress };
				log(`Wallet configured: ${spendingAddress}`);
			} catch (error) {
				log(`Warning: Failed to initialize signer: ${error instanceof Error ? error.message : 'Unknown error'}. Wallet not configured.`);
			}
		}
	} else {
		log('Wallet not configured (missing SPENDING_PRIVATE_KEY or SPENDING_CONTRACT)');
	}

	// Tools
	log('Registering tools...');
	const http = process.env.MCP_TRANSPORT === 'http';
	const tools = createTools(walletConfig, network.tzktApi, http);
	tools.forEach(tool => {
		server.registerTool(tool.name, tool.config, tool.handler);
	});
	log(`Registered ${tools.length} tools`);

	const transport = process.env.MCP_TRANSPORT || 'stdio';
	log(`Transport: ${transport}`);

	if (transport === 'http') {
		const app = express();
		app.use(express.json());

		// Dashboard frontend (serve from frontend/dist)
		const frontendPath = join(__dirname, "../frontend/dist");
		app.use(express.static(frontendPath));

		// MCP endpoint
		app.post('/mcp', async (req, res) => {
			log('Received MCP request');
			const httpTransport = new StreamableHTTPServerTransport({
				sessionIdGenerator: undefined,
				enableJsonResponse: true
			});
			res.on('close', () => httpTransport.close());
			await server.connect(httpTransport);
			await httpTransport.handleRequest(req, res, req.body);
		});

		// SPA fallback - serve index.html for all non-API routes
		app.get('/{*path}', (req, res) => {
			res.sendFile(join(frontendPath, 'index.html'));
		});

		const port = process.env.PORT || 3004;

		// Keep reference to http server and wait for it to start
		await new Promise<void>((resolve) => {
			const httpServer = app.listen(port, () => {
				log(`HTTP server listening on port ${port}`);
				log(`MCP endpoint: http://localhost:${port}/mcp`);
				resolve();
			});

			// Keep process alive
			httpServer.on('error', (err) => {
				log(`HTTP server error: ${err.message}`);
			});
		});

		// Keep the process running
		log('Server ready, waiting for requests...');

	} else {
		log('Connecting stdio transport...');
		const stdioTransport = new StdioServerTransport();
		await server.connect(stdioTransport);
		log('Stdio transport connected');
	}
}

init().catch(err => {
	console.error('[tezosx-mcp] Fatal error:', err);
	process.exit(1);
});
