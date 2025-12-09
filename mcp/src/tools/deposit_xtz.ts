import { TezosToolkit } from "@taquito/taquito";
import z from "zod";

// Constants
const MUTEZ_PER_TEZ = 1_000_000;
const CONFIRMATIONS_TO_WAIT = 3;
const TZKT_BASE_URL = "https://shadownet.tzkt.io";

// Types
const inputSchema = z.object({
	amount: z.number().describe("The amount of Tez to deposit into the bank."),
});

type DepositXtzParams = z.infer<typeof inputSchema>;

// Helper Functions

/** Convert XTZ to mutez */
const xtzToMutez = (xtz: number): number => xtz * MUTEZ_PER_TEZ;

/** Format mutez for display */
const formatMutez = (mutez: number): string => `${mutez} mutez`;

/**
 * MCP tool for depositing XTZ into the spending contract.
 *
 * @param Tezos - Configured TezosToolkit instance (with signer set to spender key)
 * @param spendingContract - Address of the spending-limited wallet contract
 * @param spendingAddress - Address of the spender account (for fee payments)
 */
export const createDepositXtzTool = (
	Tezos: TezosToolkit,
	spendingContract: string,
	spendingAddress: string
) => ({
	name: "tezos_deposit_xtz",
	config: {
		title: "Deposit Tez",
		description: "Deposits XTZ from the spender account into the spending contract (bank).",
		inputSchema,
		annotations: {
			readOnlyHint: false,
			destructiveHint: true,
			idempotentHint: false,
			openWorldHint: true,
		},
	},

	handler: async (params: any) => {
		params = params as DepositXtzParams;
		const amountMutez = xtzToMutez(params.amount);

		// Validate spender has enough funds for deposit + fees
		const spenderBalance = await Tezos.tz.getBalance(spendingAddress);
		if (spenderBalance.toNumber() < amountMutez) {
			throw new Error(
				`Insufficient spender balance. ` +
				`Requested: ${formatMutez(amountMutez)}, ` +
				`Available: ${formatMutez(spenderBalance.toNumber())}`
			);
		}

		// Send XTZ directly to the contract (calls default_ entrypoint)
		const operation = await Tezos.contract.transfer({
			to: spendingContract,
			amount: params.amount,
		});

		await operation.confirmation(CONFIRMATIONS_TO_WAIT);

		const tzktUrl = `${TZKT_BASE_URL}/${operation.hash}`;

		return {
			content: [{ type: "text" as const, text: `Deposited ${params.amount} XTZ. ${tzktUrl}` }],
		};
	},
});
