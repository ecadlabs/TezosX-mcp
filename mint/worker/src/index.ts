/**
 * Tezos x402 NFT Minting Worker
 *
 * This worker mints NFTs when users pay via the x402 protocol.
 * It returns 402 Payment Required until a valid payment is received,
 * then mints an NFT receipt to the payer.
 *
 * Endpoints:
 *   GET/POST / - Mint an NFT (requires x402 payment)
 *   GET /health - Health check
 *
 * Environment variables (secrets):
 *   TEZOS_RPC_URL      - Tezos RPC endpoint
 *   MINTER_PRIVATE_KEY - edsk... key authorized to mint
 *   NFT_CONTRACT       - KT1... FA2 NFT contract address
 *   PAYMENT_RECIPIENT  - tz1... address to receive payments
 *   FACILITATOR_URL    - x402 facilitator URL
 *   PINATA_JWT         - Pinata API JWT for IPFS
 *
 * Environment variables (vars):
 *   NETWORK            - "shadownet" or "mainnet"
 *   PAYMENT_AMOUNT     - Amount in mutez (e.g., "100000")
 */

import type { Env } from "./types/index.js";
import { handleMint } from "./handlers/mint.js";

export default {
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext
	): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;

		// CORS headers for preflight requests
		if (request.method === "OPTIONS") {
			return new Response(null, {
				headers: {
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
					"Access-Control-Allow-Headers": "Content-Type, X-PAYMENT",
					"Access-Control-Max-Age": "86400",
				},
			});
		}

		// Health check endpoint
		if (path === "/health") {
			return new Response(
				JSON.stringify({
					status: "ok",
					service: "tezos-x402-nft",
					network: env.NETWORK,
					contract: env.NFT_CONTRACT,
				}),
				{
					status: 200,
					headers: { "Content-Type": "application/json" },
				}
			);
		}

		// Root path handles minting
		if (path === "/" || path === "") {
			if (request.method === "GET" || request.method === "POST") {
				const response = await handleMint(request, env, ctx);

				// Add CORS headers to response
				const headers = new Headers(response.headers);
				headers.set("Access-Control-Allow-Origin", "*");
				headers.set("Access-Control-Expose-Headers", "X-PAYMENT");

				return new Response(response.body, {
					status: response.status,
					statusText: response.statusText,
					headers,
				});
			}

			return new Response(JSON.stringify({ error: "Method not allowed" }), {
				status: 405,
				headers: {
					"Content-Type": "application/json",
					Allow: "GET, POST, OPTIONS",
				},
			});
		}

		// 404 for unknown routes
		return new Response(JSON.stringify({ error: "Not found" }), {
			status: 404,
			headers: { "Content-Type": "application/json" },
		});
	},
};
