// Environment bindings
export interface Env {
	TEZOS_RPC_URL: string;
	MINTER_PRIVATE_KEY: string;
	NFT_CONTRACT: string;
	PAYMENT_RECIPIENT: string;
	PAYMENT_AMOUNT: string;
	PINATA_JWT: string;
	NETWORK: string;
	// Service binding to facilitator worker
	FACILITATOR: Fetcher;
}

// x402 Types
export interface PaymentRequirement {
	scheme: string;
	network: string;
	asset: string;
	amount: string;
	recipient: string;
	extra?: {
		name?: string;
		decimals?: number;
	};
}

export interface X402Response {
	x402Version: number;
	paymentRequirements: PaymentRequirement[];
}

export interface X402PaymentPayload {
	x402Version: number;
	scheme: string;
	network: string;
	asset: string;
	payload: {
		operationBytes: string;
		signature: string;
		publicKey: string;
		source: string;
	};
}

// Verification request/response
export interface VerifyRequest {
	payload: X402PaymentPayload;
	requirements: PaymentRequirement;
}

export interface VerifyResponse {
	valid: boolean;
	reason?: string;
	payer?: string;
}

// Pinata response
export interface PinataResponse {
	IpfsHash: string;
	PinSize: number;
	Timestamp: string;
}

// NFT Metadata (TZIP-21)
export interface NFTAttribute {
	name: string;
	value: string;
}

export interface NFTMetadata {
	name: string;
	description: string;
	artifactUri: string;
	displayUri: string;
	thumbnailUri: string;
	decimals: number;
	isBooleanAmount: boolean;
	attributes: NFTAttribute[];
}

// Mint result
export interface MintResult {
	tokenId: number;
	opHash: string;
	metadataUri: string;
}

// API responses
export interface SuccessResponse {
	success: true;
	nft: {
		tokenId: number;
		contract: string;
		recipient: string;
		metadataUri: string;
		opHash: string;
	};
	payment: {
		amount: string;
		settled: boolean;
	};
}

export interface ErrorResponse {
	error: string;
	code: ErrorCode;
}

export type ErrorCode =
	| "NO_PAYMENT"
	| "INVALID_PAYMENT"
	| "WRONG_NETWORK"
	| "IPFS_UPLOAD_FAILED"
	| "MINT_FAILED"
	| "SETTLE_FAILED"
	| "INVALID_REQUEST";
