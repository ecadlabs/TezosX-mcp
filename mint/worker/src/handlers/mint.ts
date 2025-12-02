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
		name: `x402 Payment Receipt #${tokenId}`,
		description: "Proof of payment via x402 protocol on Tezos",
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
		return errorResponse(
			`Invalid recipient address: ${recipientOverride}`,
			"INVALID_REQUEST",
			400
		);
	}

	// Check for X-PAYMENT header
	const paymentHeader = request.headers.get("X-PAYMENT");

	if (!paymentHeader) {
		return paymentRequiredResponse(env);
	}

	// Decode payment payload
	let paymentPayload: X402PaymentPayload;
	try {
		paymentPayload = decodePaymentHeader(paymentHeader);
	} catch (error) {
		return errorResponse(
			error instanceof Error ? error.message : "Invalid X-PAYMENT header",
			"INVALID_PAYMENT",
			400
		);
	}

	// Verify network matches
	if (paymentPayload.network !== env.NETWORK) {
		return errorResponse(
			`Wrong network: expected ${env.NETWORK}, got ${paymentPayload.network}`,
			"WRONG_NETWORK",
			402
		);
	}

	// Verify payment with facilitator
	const verification = await verifyPayment(paymentPayload, env);

	if (!verification.valid) {
		return paymentRequiredResponse(
			env,
			verification.reason || "Payment verification failed"
		);
	}

	// Determine recipient (override or payer)
	const payerAddress = verification.payer || paymentPayload.payload.source;
	const recipientAddress = recipientOverride || payerAddress;

	// Get next token ID for metadata
	let tokenId: number;
	try {
		tokenId = await getNextTokenId(env);
	} catch (error) {
		return errorResponse(
			`Failed to get token ID: ${error instanceof Error ? error.message : "Unknown error"}`,
			"MINT_FAILED",
			500
		);
	}

	const timestamp = new Date().toISOString();
	const amountXTZ = (parseInt(env.PAYMENT_AMOUNT, 10) / 1_000_000).toFixed(6);

	// Generate SVG receipt image
	const svg = generateReceiptSVG(tokenId, amountXTZ, payerAddress, timestamp);

	// Upload SVG to IPFS first
	let imageUri: string;
	try {
		imageUri = await uploadSvgToIPFS(svg, `x402-receipt-${tokenId}`, env);
	} catch (error) {
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
		metadataUri = await uploadMetadataToIPFS(metadata, env);
	} catch (error) {
		return errorResponse(
			`Metadata upload failed: ${error instanceof Error ? error.message : "Unknown error"}`,
			"IPFS_UPLOAD_FAILED",
			500
		);
	}

	// Mint the NFT
	let mintResult;
	try {
		mintResult = await mintNFT(env, recipientAddress, metadataUri);
	} catch (error) {
		return errorResponse(
			`Mint failed: ${error instanceof Error ? error.message : "Unknown error"}`,
			"MINT_FAILED",
			500
		);
	}

	// Settle payment in background (don't block response)
	ctx.waitUntil(
		settlePayment(paymentPayload, env).then((settled) => {
			if (!settled) {
				console.error("Payment settlement failed (NFT was minted)");
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

	return jsonResponse(response, 200);
}
