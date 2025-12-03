import type {
	Env,
	SuccessResponse,
	ErrorResponse,
	NFTMetadata,
	X402PaymentPayload,
} from "../types/index.js";
import {
	build402Response,
	decodePaymentHeader,
	verifyPayment,
	settlePayment,
} from "../services/x402.js";
import { getNextTokenId, mintNFT, isValidTezosAddress } from "../services/tezos.js";
import { uploadSvgToIPFS, uploadMetadataToIPFS } from "../services/ipfs.js";
import { generateReceiptSVG } from "../services/svg.js";

/**
 * Create a JSON response with proper headers
 */
function jsonResponse(
	data: object,
	status: number,
	headers: Record<string, string> = {}
): Response {
	return new Response(JSON.stringify(data, null, 2), {
		status,
		headers: {
			"Content-Type": "application/json",
			...headers,
		},
	});
}

/**
 * Create a 402 Payment Required response
 */
function paymentRequiredResponse(env: Env, reason?: string): Response {
	const body = build402Response(env);
	return jsonResponse(
		reason ? { ...body, error: reason } : body,
		402
	);
}

/**
 * Create an error response
 */
function errorResponse(
	error: string,
	code: ErrorResponse["code"],
	status: number
): Response {
	const body: ErrorResponse = { error, code };
	return jsonResponse(body, status);
}

/**
 * Build NFT metadata from payment details
 * Uses TZIP-21 standard fields for proper indexer recognition
 */
function buildMetadata(
	tokenId: number,
	imageUri: string,
	amountMutez: string,
	payerAddress: string,
	recipientAddress: string,
	network: string,
	timestamp: string
): NFTMetadata {
	const amountXTZ = (parseInt(amountMutez, 10) / 1_000_000).toFixed(6);

	return {
		name: `x402 Collectors Card #${tokenId}`,
		description: "Proof of making a payment via x402 protocol on Tezos",
		artifactUri: imageUri,
		displayUri: imageUri,
		thumbnailUri: imageUri,
		decimals: 0,
		isBooleanAmount: true,
		attributes: [
			{ name: "Amount", value: `${amountXTZ} XTZ` },
			{ name: "Payer", value: payerAddress },
			{ name: "Recipient", value: recipientAddress },
			{ name: "Timestamp", value: timestamp },
			{ name: "Network", value: network },
			{ name: "Token ID", value: tokenId.toString() },
		],
	};
}

/**
 * Handle the /mint endpoint
 */
export async function handleMint(
	request: Request,
	env: Env,
	ctx: ExecutionContext
): Promise<Response> {
	console.log("[mint] Request received:", request.method, request.url);

	// Parse recipient from query params or body
	let recipientOverride: string | null = null;

	const url = new URL(request.url);
	recipientOverride = url.searchParams.get("recipient");

	if (!recipientOverride && request.method === "POST") {
		try {
			const body = await request.json<{ recipient?: string }>();
			recipientOverride = body.recipient || null;
		} catch {
			// No body or invalid JSON, continue without override
		}
	}

	// Validate recipient override if provided
	if (recipientOverride && !isValidTezosAddress(recipientOverride)) {
		console.log("[mint] Invalid recipient address:", recipientOverride);
		return errorResponse(
			`Invalid recipient address: ${recipientOverride}`,
			"INVALID_REQUEST",
			400
		);
	}

	// Check for X-PAYMENT header
	const paymentHeader = request.headers.get("X-PAYMENT");

	if (!paymentHeader) {
		console.log("[mint] No X-PAYMENT header, returning 402");
		return paymentRequiredResponse(env);
	}

	console.log("[mint] X-PAYMENT header present, decoding...");

	// Decode payment payload
	let paymentPayload: X402PaymentPayload;
	try {
		paymentPayload = decodePaymentHeader(paymentHeader);
		console.log("[mint] Payment decoded:", {
			network: paymentPayload.network,
			scheme: paymentPayload.scheme,
			source: paymentPayload.payload?.source,
		});
	} catch (error) {
		console.error("[mint] Failed to decode payment:", error);
		return errorResponse(
			error instanceof Error ? error.message : "Invalid X-PAYMENT header",
			"INVALID_PAYMENT",
			400
		);
	}

	// Verify network matches
	if (paymentPayload.network !== env.NETWORK) {
		console.log("[mint] Network mismatch:", paymentPayload.network, "vs", env.NETWORK);
		return errorResponse(
			`Wrong network: expected ${env.NETWORK}, got ${paymentPayload.network}`,
			"WRONG_NETWORK",
			402
		);
	}

	// Verify payment with facilitator
	console.log("[mint] Verifying payment with facilitator:", env.FACILITATOR_URL);
	const verification = await verifyPayment(paymentPayload, env);

	if (!verification.valid) {
		console.log("[mint] Verification failed:", verification.reason);
		return paymentRequiredResponse(
			env,
			verification.reason || "Payment verification failed"
		);
	}

	console.log("[mint] Payment verified successfully, payer:", verification.payer);

	// Determine recipient (override or payer)
	const payerAddress = verification.payer || paymentPayload.payload.source;
	const recipientAddress = recipientOverride || payerAddress;

	// Get next token ID for metadata
	let tokenId: number;
	try {
		console.log("[mint] Getting next token ID...");
		tokenId = await getNextTokenId(env);
		console.log("[mint] Next token ID:", tokenId);
	} catch (error) {
		console.error("[mint] Failed to get token ID:", error);
		return errorResponse(
			`Failed to get token ID: ${error instanceof Error ? error.message : "Unknown error"}`,
			"MINT_FAILED",
			500
		);
	}

	const timestamp = new Date().toISOString();
	const amountXTZ = (parseInt(env.PAYMENT_AMOUNT, 10) / 1_000_000).toFixed(6);

	// Generate SVG receipt image
	console.log("[mint] Generating SVG...");
	const svg = generateReceiptSVG(tokenId, amountXTZ, payerAddress, timestamp);

	// Upload SVG to IPFS first
	let imageUri: string;
	try {
		console.log("[mint] Uploading SVG to IPFS...");
		imageUri = await uploadSvgToIPFS(svg, `x402-receipt-${tokenId}`, env);
		console.log("[mint] SVG uploaded:", imageUri);
	} catch (error) {
		console.error("[mint] SVG upload failed:", error);
		return errorResponse(
			`SVG upload failed: ${error instanceof Error ? error.message : "Unknown error"}`,
			"IPFS_UPLOAD_FAILED",
			500
		);
	}

	// Build metadata with IPFS image URL
	const metadata = buildMetadata(
		tokenId,
		imageUri,
		env.PAYMENT_AMOUNT,
		payerAddress,
		recipientAddress,
		env.NETWORK,
		timestamp
	);

	// Upload metadata to IPFS
	let metadataUri: string;
	try {
		console.log("[mint] Uploading metadata to IPFS...");
		metadataUri = await uploadMetadataToIPFS(metadata, env);
		console.log("[mint] Metadata uploaded:", metadataUri);
	} catch (error) {
		console.error("[mint] Metadata upload failed:", error);
		return errorResponse(
			`Metadata upload failed: ${error instanceof Error ? error.message : "Unknown error"}`,
			"IPFS_UPLOAD_FAILED",
			500
		);
	}

	// Mint the NFT
	let mintResult;
	try {
		console.log("[mint] Minting NFT to:", recipientAddress);
		mintResult = await mintNFT(env, recipientAddress, metadataUri);
		console.log("[mint] NFT minted:", mintResult.opHash);
	} catch (error) {
		console.error("[mint] Mint failed:", error);
		return errorResponse(
			`Mint failed: ${error instanceof Error ? error.message : "Unknown error"}`,
			"MINT_FAILED",
			500
		);
	}

	// Settle payment in background (don't block response)
	console.log("[mint] Starting background settlement...");
	ctx.waitUntil(
		settlePayment(paymentPayload, env).then((settled) => {
			if (settled) {
				console.log("[mint] Payment settled successfully");
			} else {
				console.error("[mint] Payment settlement failed (NFT was minted)");
			}
		})
	);

	const response: SuccessResponse = {
		success: true,
		nft: {
			tokenId: mintResult.tokenId,
			contract: env.NFT_CONTRACT,
			recipient: recipientAddress,
			metadataUri: mintResult.metadataUri,
			opHash: mintResult.opHash,
		},
		payment: {
			amount: `${amountXTZ} XTZ`,
			settled: true, // Optimistically true, settlement happens in background
		},
	};

	console.log("[mint] Success! Token ID:", mintResult.tokenId);
	return jsonResponse(response, 200);
}
