import z from "zod";
import { ensureRevealed } from "./reveal_account.js";
import type { LiveConfig } from "../live-config.js";

const CONFIRMATIONS_TO_WAIT = 3;

const inputSchema = z.object({
	destination: z.string().optional().describe(
		"Address to send recovered funds to. Defaults to the contract owner's address."
	),
});

type RecoverParams = z.infer<typeof inputSchema>;

export const createRecoverSpenderFundsTool = (config: LiveConfig) => ({
	name: "tezos_recover_spender_funds",
	config: {
		title: "Recover Spender Gas Funds",
		description:
			"Transfers the spender address's XTZ balance (used for gas fees) to the contract owner or a specified address. " +
			"Useful for recovering funds when decommissioning a spender or rebalancing. " +
			"Always fetches the live on-chain balance — call this tool every time the user asks, even if a previous call returned zero.",
		inputSchema,
		annotations: {
			readOnlyHint: false,
			destructiveHint: true,
			idempotentHint: false,
			openWorldHint: true,
		},
	},

	handler: async (params: any) => {
		params = params as RecoverParams;
		const { Tezos, spendingContract, spendingAddress, tzktApi } = config;

		// Resolve destination: explicit param > contract owner > spending contract
		let destination = params.destination;
		if (!destination) {
			if (spendingContract) {
				const contract = await Tezos.contract.at(spendingContract);
				const storage = await contract.storage<{ owner: string }>();
				destination = storage.owner;
			}
		}
		if (!destination) {
			throw new Error("No destination provided and no spending contract configured.");
		}

		const balance = await Tezos.tz.getBalance(spendingAddress);
		const balanceMutez = balance.toNumber();

		if (balanceMutez === 0) {
			return {
				content: [{
					type: "text" as const,
					text: `Spender address (${spendingAddress}) has zero balance. Nothing to recover.`,
				}],
			};
		}

		await ensureRevealed(Tezos);

		// Drain account pattern (Taquito docs):
		// For KT1 destinations, call the default entrypoint explicitly.
		// For implicit accounts, use a simple transfer.
		const isContract = destination.startsWith("KT1");

		if (isContract) {
			const contract = await Tezos.contract.at(destination);
			const depositCall = contract.methodsObject.default_(null);
			const estimate = await Tezos.estimate.contractCall(depositCall);

			const maxAmount = balanceMutez - estimate.suggestedFeeMutez;
			if (maxAmount <= 0) {
				return {
					content: [{
						type: "text" as const,
						text: `Spender balance (${balanceMutez} mutez) is too low to cover transfer fees (${estimate.suggestedFeeMutez} mutez). Nothing to recover.`,
					}],
				};
			}

			const operation = await contract.methodsObject.default_(null).send({
				amount: maxAmount,
				mutez: true,
				fee: estimate.suggestedFeeMutez,
				gasLimit: estimate.gasLimit,
				storageLimit: 0,
			});
			await operation.confirmation(CONFIRMATIONS_TO_WAIT);

			const tzktBase = tzktApi.replace("api.", "");
			return {
				content: [{
					type: "text" as const,
					text: `Recovered ${(maxAmount / 1_000_000).toFixed(6)} XTZ from spender (${spendingAddress}) to ${destination}.\n${tzktBase}/${operation.hash}`,
				}],
			};
		}

		// Implicit account (tz1/tz2/tz3)
		const estimate = await Tezos.estimate.transfer({
			to: destination,
			amount: balanceMutez,
			mutez: true,
		});

		const maxAmount = balanceMutez - estimate.suggestedFeeMutez;
		if (maxAmount <= 0) {
			return {
				content: [{
					type: "text" as const,
					text: `Spender balance (${balanceMutez} mutez) is too low to cover transfer fees (${estimate.suggestedFeeMutez} mutez). Nothing to recover.`,
				}],
			};
		}

		const operation = await Tezos.contract.transfer({
			to: destination,
			amount: maxAmount,
			mutez: true,
			fee: estimate.suggestedFeeMutez,
			gasLimit: estimate.gasLimit,
			storageLimit: 0,
		});
		await operation.confirmation(CONFIRMATIONS_TO_WAIT);

		const tzktBase = tzktApi.replace("api.", "");
		return {
			content: [{
				type: "text" as const,
				text: `Recovered ${(maxAmount / 1_000_000).toFixed(6)} XTZ from spender (${spendingAddress}) to ${destination}.\n${tzktBase}/${operation.hash}`,
			}],
		};
	},
});
