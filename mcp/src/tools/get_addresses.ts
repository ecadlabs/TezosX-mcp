import z from "zod";
import type { LiveConfig } from "../live-config.js";

// Types
interface ContractStorage {
	owner: string;
	spender: string;
	daily_limit: { toNumber: () => number };
	per_tx_limit: { toNumber: () => number };
	spent_today: { toNumber: () => number };
	last_reset: string;
}

export const createGetAddressesTool = (config: LiveConfig) => ({
	name: "tezos_get_addresses",
	config: {
		title: "Get Tezos Addresses",
		description:
			"Returns the spending contract address, owner address, and spender address from the contract storage.",
		inputSchema: z.object({}),
		annotations: {
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async () => {
		const { Tezos, spendingContract } = config;
		const contract = await Tezos.contract.at(spendingContract);
		const storage = (await contract.storage()) as ContractStorage;

		const result = {
			contractAddress: spendingContract,
			ownerAddress: storage.owner,
			spenderAddress: storage.spender,
		};

		return {
			content: [
				{
					type: "text" as const,
					text: JSON.stringify(result, null, 2),
				},
			],
		};
	},
});