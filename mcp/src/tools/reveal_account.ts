import { TezosToolkit } from "@taquito/taquito";
import z from "zod";

/**
 * Check if an account is revealed on the Tezos network.
 */
export async function isAccountRevealed(Tezos: TezosToolkit, address: string): Promise<boolean> {
	const managerKey = await Tezos.rpc.getManagerKey(address);
	return managerKey !== null;
}

/**
 * Reveal an account if not already revealed.
 * Returns true if reveal was needed and performed, false if already revealed.
 */
export async function ensureRevealed(Tezos: TezosToolkit): Promise<{ wasRevealed: boolean; opHash?: string }> {
	const address = await Tezos.signer.publicKeyHash();
	const revealed = await isAccountRevealed(Tezos, address);

	if (revealed) {
		return { wasRevealed: false };
	}

	const op = await Tezos.contract.reveal({});
	await op.confirmation(1);

	return { wasRevealed: true, opHash: op.hash };
}

export const createRevealAccountTool = (Tezos: TezosToolkit) => ({
	name: "tezos_reveal_account",
	config: {
		title: "Reveal Account",
		description: "Reveals the spender account's public key on the Tezos network. This is required before the account can perform any operations. The tool checks if the account is already revealed and only performs the reveal operation if needed.",
		inputSchema: z.object({}),
		annotations: {
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		}
	},
	handler: async () => {
		const address = await Tezos.signer.publicKeyHash();
		const result = await ensureRevealed(Tezos);

		return {
			content: [{
				type: "text" as const,
				text: JSON.stringify({
					success: true,
					message: result.wasRevealed ? `Account ${address} has been revealed` : `Account ${address} was already revealed`,
					operationHash: result.opHash,
					alreadyRevealed: !result.wasRevealed,
				}, null, 2)
			}]
		};
	}
});
