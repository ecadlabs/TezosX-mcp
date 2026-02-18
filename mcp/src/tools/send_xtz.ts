import { TezosToolkit } from "@taquito/taquito";
import z from "zod";
import { ensureRevealed } from "./reveal_account.js";

// Constants
const MUTEZ_PER_TEZ = 1_000_000;
const CONFIRMATIONS_TO_WAIT = 3;
const TZKT_BASE_URL = "https://shadownet.tzkt.io";

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

/**
 * MCP tool for sending XTZ via a spending contract.
 *
 * @param Tezos - Configured TezosToolkit instance (with signer set to spender key)
 * @param spendingContract - Address of the spending-limited wallet contract
 * @param spendingAddress - Address of the spender account (for fee payments)
 */
export const createSendXtzTool = (
	Tezos: TezosToolkit,
	spendingContract: string,
	spendingAddress: string
) => ({
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

		const contract = await Tezos.contract.at(spendingContract);

		// Two-pass fee estimation: first pass gets approximate fee, second pass
		// re-estimates with that fee as fee_rebate so the operation size matches the real call
		const makeSpendCall = (feeRebate: number) =>
			contract.methodsObject.spend({
				recipient: params.toAddress,
				amount: amountMutez,
				fee_rebate: feeRebate,
			});

		let estimate;
		try {
			const initialEstimate = await Tezos.estimate.contractCall(makeSpendCall(0));
			estimate = await Tezos.estimate.contractCall(makeSpendCall(initialEstimate.suggestedFeeMutez));
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : String(err);
			if (message.includes("balance_too_low")) {
				throw new Error(
					`Spender balance (${formatMutez(spenderBalance.toNumber())}) ` +
					`is too low to cover fees. Please fund the spending address.`
				);
			}
			throw err;
		}

		if (spenderBalance.toNumber() < estimate.totalCost) {
			throw new Error(
				`Spender balance too low for fees. ` +
				`Required: ${formatMutez(estimate.totalCost)}, ` +
				`Available: ${formatMutez(spenderBalance.toNumber())}`
			);
		}

		// Execute with fee_rebate matching what was estimated
		const contractCall = makeSpendCall(estimate.suggestedFeeMutez);
		const operation = await contractCall.send();
		await operation.confirmation(CONFIRMATIONS_TO_WAIT);

		const tzktUrl = `${TZKT_BASE_URL}/${operation.hash}`;

		return {
			content: [{ type: "text" as const, text: tzktUrl }],
		};
	},
});
