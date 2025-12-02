import type {
	Env,
	X402Response,
	X402PaymentPayload,
	PaymentRequirement,
	VerifyResponse,
} from "../types/index.js";

/**
 * Build the 402 Payment Required response
 */
export function build402Response(env: Env): X402Response {
	return {
		x402Version: 1,
		paymentRequirements: [
			{
				scheme: "exact-tezos",
				network: env.NETWORK,
				asset: "XTZ",
				amount: env.PAYMENT_AMOUNT,
				recipient: env.PAYMENT_RECIPIENT,
				extra: {
					name: "XTZ",
					decimals: 6,
				},
			},
		],
	};
}

/**
 * Get the payment requirement for verification
 */
export function getPaymentRequirement(env: Env): PaymentRequirement {
	return {
		scheme: "exact-tezos",
		network: env.NETWORK,
		asset: "XTZ",
		amount: env.PAYMENT_AMOUNT,
		recipient: env.PAYMENT_RECIPIENT,
	};
}

/**
 * Decode the X-PAYMENT header from base64
 */
export function decodePaymentHeader(header: string): X402PaymentPayload {
	try {
		const decoded = atob(header);
		return JSON.parse(decoded) as X402PaymentPayload;
	} catch {
		throw new Error("Invalid X-PAYMENT header: failed to decode base64 or parse JSON");
	}
}

/**
 * Verify payment with the facilitator
 */
export async function verifyPayment(
	payload: X402PaymentPayload,
	env: Env
): Promise<VerifyResponse> {
	const requirement = getPaymentRequirement(env);

	// Check network matches
	if (payload.network !== env.NETWORK) {
		return {
			valid: false,
			reason: `Wrong network: expected ${env.NETWORK}, got ${payload.network}`,
		};
	}

	const response = await fetch(`${env.FACILITATOR_URL}/verify`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			payload,
			requirements: requirement,
		}),
	});

	if (!response.ok) {
		const errorText = await response.text();
		return {
			valid: false,
			reason: `Facilitator verification failed: ${response.status} - ${errorText}`,
		};
	}

	const result = await response.json<VerifyResponse>();

	// Add payer address from payload if verification succeeded
	if (result.valid && payload.payload?.source) {
		result.payer = payload.payload.source;
	}

	return result;
}

/**
 * Settle the payment with the facilitator (fire and forget)
 */
export async function settlePayment(
	payload: X402PaymentPayload,
	env: Env
): Promise<boolean> {
	try {
		const response = await fetch(`${env.FACILITATOR_URL}/settle`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ payload }),
		});

		return response.ok;
	} catch {
		return false;
	}
}
