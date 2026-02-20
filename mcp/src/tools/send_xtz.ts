import z from "zod";
import { ensureRevealed } from "./reveal_account.js";
import type { LiveConfig } from "../live-config.js";

// Constants
const MUTEZ_PER_TEZ = 1_000_000;
const CONFIRMATIONS_TO_WAIT = 3;
const TZKT_BASE_URL = "https://shadownet.tzkt.io";
const SPENDER_TOP_UP_THRESHOLD = 250_000; // 0.25 XTZ
const SPENDER_TOP_UP_TARGET = 500_000;    // 0.5 XTZ

// Types
const inputSchema = z.object({
	toAddress: z.string().describe("The address to send Tez to."),
	amount: z.number().describe("The amount of Tez to send to the address."),
});

type SendXtzParams = z.infer<typeof inputSchema>;

// Helper Functions

/** Convert XTZ to mutez */
const xtzToMutez = (xtz: number): number => xtz * MUTEZ_PER_TEZ;

/** Format mutez for display */
const formatMutez = (mutez: number): string => `${mutez} mutez`;

// Cache the last-verified spender so we only hit the chain when config changes
let verifiedSpender: { address: string; contract: string } | null = null;

export const createSendXtzTool = (config: LiveConfig) => ({
	name: "tezos_send_xtz",
	config: {
		title: "Send Tez",
		description: "Sends a set amount of Tez to another address via the spending contract.",
		inputSchema,
		annotations: {
			readOnlyHint: false,
			destructiveHint: true,
			idempotentHint: false,
			openWorldHint: true,
		},
	},

	handler: async (params: any) => {
		params = params as SendXtzParams;
		const { Tezos, spendingContract, spendingAddress } = config;

		// Verify the server's signer matches the on-chain spender (only when config changes)
		const needsVerify = !verifiedSpender
			|| verifiedSpender.address !== spendingAddress
			|| verifiedSpender.contract !== spendingContract;

		if (needsVerify) {
			const c = await Tezos.contract.at(spendingContract);
			const storage = await c.storage<{ spender: string }>();
			if (storage.spender !== spendingAddress) {
				throw new Error(
					`Spender mismatch: the server's signing key (${spendingAddress}) does not match ` +
					`the contract's spender (${storage.spender}). ` +
					`Please regenerate the spender key from the dashboard.`
				);
			}
			verifiedSpender = { address: spendingAddress, contract: spendingContract };
		}

		// Validate spender has funds for fees
		const spenderBalance = await Tezos.tz.getBalance(spendingAddress);
		if (spenderBalance.isZero()) {
			throw new Error(
				"Spending account balance is 0. " +
				"Please fund the spending address to cover transaction fees."
			);
		}

		// Validate contract has funds for transfer
		const contractBalance = await Tezos.tz.getBalance(spendingContract);
		const amountMutez = xtzToMutez(params.amount);

		if (contractBalance.toNumber() < amountMutez) {
			throw new Error(
				`Insufficient contract balance. ` +
				`Requested: ${formatMutez(amountMutez)}, ` +
				`Available: ${formatMutez(contractBalance.toNumber())}`
			);
		}

		// Taquito auto-reveals on send(), but the estimate step below
		// simulates via RPC without handling revelation — so we reveal first.
		await ensureRevealed(Tezos);

		// Top up spender from contract if balance is low
		const spenderMutez = spenderBalance.toNumber();
		const feeRebate = spenderMutez < SPENDER_TOP_UP_THRESHOLD
			? SPENDER_TOP_UP_TARGET - spenderMutez
			: 0;

		const contract = await Tezos.contract.at(spendingContract);
		const contractCall = contract.methodsObject.spend({
			recipient: params.toAddress,
			amount: amountMutez,
			fee_rebate: feeRebate,
		});

		// Estimate fees
		let estimate;
		try {
			estimate = await Tezos.estimate.contractCall(contractCall);
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : String(err);
			if (message.includes("balance_too_low")) {
				throw new Error(
					`Spender balance (${formatMutez(spenderMutez)}) ` +
					`is too low to cover fees. Please fund the spending address.`
				);
			}
			throw err;
		}

		if (spenderMutez < estimate.totalCost) {
			throw new Error(
				`Spender balance too low for fees. ` +
				`Required: ${formatMutez(estimate.totalCost)}, ` +
				`Available: ${formatMutez(spenderMutez)}`
			);
		}

		const operation = await contractCall.send();
		await operation.confirmation(CONFIRMATIONS_TO_WAIT);

		const tzktUrl = `${TZKT_BASE_URL}/${operation.hash}`;

		return {
			content: [{ type: "text" as const, text: tzktUrl }],
		};
	},
});
