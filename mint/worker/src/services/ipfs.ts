import type { Env, NFTMetadata, PinataResponse } from "../types/index.js";

const PINATA_JSON_URL = "https://api.pinata.cloud/pinning/pinJSONToIPFS";
const PINATA_FILE_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS";

/**
 * Upload SVG image to IPFS via Pinata
 */
export async function uploadSvgToIPFS(
	svg: string,
	name: string,
	env: Env
): Promise<string> {
	// Create form data with the SVG file
	const formData = new FormData();
	const blob = new Blob([svg], { type: "image/svg+xml" });
	formData.append("file", blob, `${name}.svg`);
	formData.append(
		"pinataMetadata",
		JSON.stringify({ name: `${name}.svg` })
	);

	const response = await fetch(PINATA_FILE_URL, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${env.PINATA_JWT}`,
		},
		body: formData,
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`SVG upload failed: ${response.status} - ${errorText}`);
	}

	const result = await response.json<PinataResponse>();
	return `ipfs://${result.IpfsHash}`;
}

/**
 * Upload metadata JSON to IPFS via Pinata
 */
export async function uploadMetadataToIPFS(
	metadata: NFTMetadata,
	env: Env
): Promise<string> {
	const response = await fetch(PINATA_JSON_URL, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${env.PINATA_JWT}`,
		},
		body: JSON.stringify({
			pinataContent: metadata,
			pinataMetadata: {
				name: `x402-receipt-${Date.now()}`,
			},
		}),
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Metadata upload failed: ${response.status} - ${errorText}`);
	}

	const result = await response.json<PinataResponse>();
	return `ipfs://${result.IpfsHash}`;
}
