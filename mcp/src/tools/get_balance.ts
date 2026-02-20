import z from "zod";
import type { LiveConfig } from "../live-config.js";

export const createGetBalanceTool = (config: LiveConfig) => ({
	name: "tezos_get_balance",
	config:
	{
		title: "Get Balances",
		description: "Returns the balance of the spending contract (usable tokens) and spending address (tokens for fees)",
		inputSchema: z.object({}),
		annotations: {
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: false,
			openWorldHint: true,
		}
	},
	handler: async () => {
		try {
			const { Tezos, spendingContract, spendingAddress } = config;
			const spendingAddressBalance = (await Tezos.tz.getBalance(spendingAddress)).toString();
			const spendingContractBalance = (await Tezos.tz.getBalance(spendingContract)).toString();

			return {
				content: [{ type: "text" as const, text: `Spending address balance: ${spendingAddressBalance} mutez. Spending contract balance: ${spendingContractBalance} mutez` }]
			};
		} catch (error) {
			throw new Error(`Failed to get balance: ${error instanceof Error ? error.message : error}`)
		}
	}
});