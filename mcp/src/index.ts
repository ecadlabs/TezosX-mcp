#!/usr/bin/env node
export const DEFAULT_WEB_PORT = '13205';

import { config } from 'dotenv';

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

// Config
import { createLiveConfig, configureLiveConfig, NETWORKS, type NetworkName } from "./live-config.js";
import { loadConfig } from "./config-store.js";
import { createApiRouter } from "./api.js";

config({ quiet: true });
const __dirname = fileURLToPath(new URL(".", import.meta.url));

// Global error handlers
process.on('uncaughtException', (err) => {
	console.error('[tezosx-mcp] Uncaught exception:', err);
});
process.on('unhandledRejection', (reason) => {
	console.error('[tezosx-mcp] Unhandled rejection:', reason);
});

function isValidPrivateKey(key: string): boolean {
	return key.startsWith('edsk') || key.startsWith('spsk') || key.startsWith('p2sk');
}

const log = (msg: string) => console.error(`[tezosx-mcp] ${msg}`);

const init = async () => {
	log('Starting server...');

	// Determine network
	const networkName = (process.env.TEZOS_NETWORK || 'mainnet') as NetworkName;
	if (!(networkName in NETWORKS)) {
		throw new ReferenceError(`Invalid network: ${networkName}. Valid options: ${Object.keys(NETWORKS).join(', ')}`);
	}
	log(`Network: ${networkName}`);

	// Create shared mutable config
	const liveConfig = createLiveConfig(networkName);

	// Try to load config: persistent store first, then env vars
	const stored = loadConfig();
	const privateKey = stored.spendingPrivateKey?.trim() || process.env.SPENDING_PRIVATE_KEY?.trim();
	const spendingContract = stored.spendingContract?.trim() || process.env.SPENDING_CONTRACT?.trim();
	const configNetwork = (stored.network as NetworkName) || networkName;

	if (privateKey && spendingContract) {
		if (!isValidPrivateKey(privateKey)) {
			log('Warning: Invalid private key format. Must start with edsk, spsk, or p2sk. Wallet not configured.');
		} else {
			try {
				const spendingAddress = await configureLiveConfig(liveConfig, privateKey, spendingContract, configNetwork);
				log(`Wallet configured: ${spendingAddress}`);
				if (stored.spendingPrivateKey) {
					log('Config loaded from persistent store');
				} else {
					log('Config loaded from environment variables');
				}
			} catch (error) {
				log(`Warning: Failed to initialize signer: ${error instanceof Error ? error.message : 'Unknown error'}. Wallet not configured.`);
			}
		}
	} else {
		log('Wallet not configured — visit the dashboard to set up');
	}

	const server = new McpServer({
		name: "tezosx-mcp",
		version: "1.0.0"
	});

	// Tools
	log('Registering tools...');
	const http = process.env.MCP_TRANSPORT === 'http';
	const tools = createTools(liveConfig, http);
	tools.forEach(tool => {
		server.registerTool(tool.name, tool.config, tool.handler);
	});
	log(`Registered ${tools.length} tools`);

	// API router (shared between both transports)
	const apiRouter = createApiRouter(liveConfig);

	// Start web server for frontend (skip if SKIP_FRONTEND is set or if using HTTP transport)
	const skipFrontend = process.env.SKIP_FRONTEND === 'true' || http;
	if (!skipFrontend) {
		const webPort = parseInt(process.env.WEB_PORT || DEFAULT_WEB_PORT, 10);
		startWebServer(webPort, apiRouter);
		log(`Frontend server started on port ${webPort}`);
	}

	const transport = process.env.MCP_TRANSPORT || 'stdio';
	log(`Transport: ${transport}`);

	if (transport === 'http') {
		const app = express();
		app.use(express.json());

		// API routes
		app.use(apiRouter);

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
