/**
 * Generate an SVG receipt image for the NFT
 */
export function generateReceiptSVG(
	tokenId: number,
	amountXTZ: string,
	payerAddress: string,
	timestamp: string
): string {
	const paddedId = tokenId.toString().padStart(4, "0");
	const payerShort = `${payerAddress.slice(0, 8)}...${payerAddress.slice(-6)}`;

	return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a2e"/>
      <stop offset="100%" style="stop-color:#16213e"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <text x="200" y="80" text-anchor="middle" fill="#0f4c75" font-family="monospace" font-size="20" font-weight="bold">x402 COLLECTORS CARD</text>
  <text x="200" y="160" text-anchor="middle" fill="#fff" font-family="monospace" font-size="48">#${paddedId}</text>
  <text x="200" y="220" text-anchor="middle" fill="#3282b8" font-family="monospace" font-size="24">${amountXTZ} XTZ</text>
  <text x="200" y="280" text-anchor="middle" fill="#666" font-family="monospace" font-size="14">${payerShort}</text>
  <text x="200" y="320" text-anchor="middle" fill="#444" font-family="monospace" font-size="12">${timestamp}</text>
  <text x="200" y="370" text-anchor="middle" fill="#0f4c75" font-family="monospace" font-size="10">TEZOS x402</text>
</svg>`;
}

/**
 * Convert SVG to base64 data URI
 */
export function svgToDataUri(svg: string): string {
	const base64 = btoa(svg);
	return `data:image/svg+xml;base64,${base64}`;
}
