import axios from "axios";
import z from "zod";
import { ensureRevealed } from "./reveal_account.js";
import type { LiveConfig } from "../live-config.js";
import type { NetworkName } from "../live-config.js";

const CONFIRMATIONS_TO_WAIT = 3;

const BRIDGE_CONFIG: Record<NetworkName, {
	smartRollupAddress: string;
}> = {
	mainnet: {
		smartRollupAddress: "sr1Ghq66tYK9y3r8CC1Tf8i8m5nxh8nTvZEf",
	},
	shadownet: {
		smartRollupAddress: "sr19fMYrr5C4qqvQqQrDSjtP31GcrWjodzvg",
	},
};

// Default rollup node URLs (can be overridden via env)
const ROLLUP_NODE_URLS: Record<NetworkName, string | undefined> = {
	mainnet: process.env.ETHERLINK_ROLLUP_NODE_MAINNET,
	shadownet: process.env.ETHERLINK_ROLLUP_NODE_SHADOWNET,
};

const inputSchema = z.object({
	// Option 1: provide outbox level + message index (requires rollup node access)
	outboxLevel: z.number().optional().describe(
		"The Tezos L1 block level of the outbox containing the withdrawal message. " +
		"Used with messageIndex to auto-fetch the proof from the rollup node."
	),
	messageIndex: z.number().optional().describe(
		"The index of the message within the outbox level. Defaults to 0."
	),
	// Option 2: provide pre-computed proof directly
	cementedCommitment: z.string().optional().describe(
		"The cemented commitment hash (src1...). Required if outputProof is provided directly."
	),
	outputProof: z.string().optional().describe(
		"The hex-encoded output proof. If provided along with cementedCommitment, skips rollup node query."
	),
});

type ExecuteParams = z.infer<typeof inputSchema>;

async function fetchProofFromRollupNode(
	rollupNodeUrl: string,
	outboxLevel: number,
	messageIndex: number,
): Promise<{ commitment: string; proof: string }> {
	const url = `${rollupNodeUrl}/global/block/head/helpers/proofs/outbox/${outboxLevel}/messages?index=${messageIndex}`;

	try {
		const { data } = await axios.get(url, { timeout: 30_000 });
		return {
			commitment: data.commitment,
			proof: data.proof,
		};
	} catch (error) {
		const msg = error instanceof Error ? error.message : String(error);
		throw new Error(
			`Failed to fetch outbox proof from rollup node at ${rollupNodeUrl}: ${msg}\n` +
			`Ensure ETHERLINK_ROLLUP_NODE_MAINNET or ETHERLINK_ROLLUP_NODE_SHADOWNET env var is set to a valid rollup node URL.`
		);
	}
}

async function getCementedCommitment(
	tezosRpcUrl: string,
	rollupAddress: string,
): Promise<{ hash: string; level: number }> {
	const url = `${tezosRpcUrl}/chains/main/blocks/head/context/smart_rollups/smart_rollup/${rollupAddress}/last_cemented_commitment_hash_with_level`;

	try {
		const { data } = await axios.get(url, { timeout: 15_000 });
		return { hash: data.hash, level: data.level };
	} catch (error) {
		const msg = error instanceof Error ? error.message : String(error);
		throw new Error(`Failed to get cemented commitment: ${msg}`);
	}
}

export const createBridgeExecuteWithdrawalTool = (config: LiveConfig) => ({
	name: "tezos_bridge_execute_withdrawal",
	config: {
		title: "Execute Bridge Withdrawal",
		description:
			"Executes a cemented outbox message on Tezos L1 to finalize a standard bridge withdrawal (Etherlink → Tezos). " +
			"This can only be done after the commitment containing the withdrawal has been cemented (~15 days after initiation). " +
			"Provide either outboxLevel + messageIndex (auto-fetches proof from rollup node) or cementedCommitment + outputProof directly. " +
			"Requires ETHERLINK_ROLLUP_NODE_MAINNET or ETHERLINK_ROLLUP_NODE_SHADOWNET env var for auto-fetch mode.",
		inputSchema,
		annotations: {
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: true,
		},
	},

	handler: async (params: any) => {
		params = params as ExecuteParams;
		const { Tezos, networkName, spendingAddress } = config;

		const bridgeConfig = BRIDGE_CONFIG[networkName];
		if (!bridgeConfig) {
			throw new Error(`Bridge not supported on network: ${networkName}`);
		}

		let commitment: string;
		let proof: string;

		if (params.outputProof && params.cementedCommitment) {
			// Direct mode: use provided proof
			commitment = params.cementedCommitment;
			proof = params.outputProof;
		} else if (params.outboxLevel !== undefined) {
			// Auto-fetch mode: query rollup node for proof
			const rollupNodeUrl = ROLLUP_NODE_URLS[networkName];
			if (!rollupNodeUrl) {
				throw new Error(
					`No rollup node URL configured for ${networkName}. ` +
					`Set ETHERLINK_ROLLUP_NODE_${networkName.toUpperCase()} environment variable, ` +
					`or provide cementedCommitment and outputProof directly.`
				);
			}

			const messageIndex = params.messageIndex ?? 0;
			const proofResult = await fetchProofFromRollupNode(
				rollupNodeUrl,
				params.outboxLevel,
				messageIndex,
			);
			commitment = proofResult.commitment;
			proof = proofResult.proof;
		} else {
			throw new Error(
				"Provide either: (1) outboxLevel + messageIndex to auto-fetch proof from rollup node, " +
				"or (2) cementedCommitment + outputProof directly."
			);
		}

		// Check spender has enough for fees
		const spenderBalance = await Tezos.tz.getBalance(spendingAddress);
		if (spenderBalance.isZero()) {
			throw new Error(
				"Spending account balance is 0. Please fund the spending address to cover transaction fees."
			);
		}

		await ensureRevealed(Tezos);

		// Execute the outbox message
		const op = await Tezos.contract.smartRollupExecuteOutboxMessage({
			rollup: bridgeConfig.smartRollupAddress,
			cementedCommitment: commitment,
			outputProof: proof,
		});

		await op.confirmation(CONFIRMATIONS_TO_WAIT);

		const tzktBase = config.tzktApi.replace('api.', '').replace('/v1', '');
		const tzktUrl = `${tzktBase}/${op.hash}`;

		return {
			content: [{
				type: "text" as const,
				text: `Outbox message executed successfully.\n` +
					`Commitment: ${commitment}\n` +
					`Operation: ${tzktUrl}\n` +
					`The withdrawal funds have been released to the recipient on Tezos L1.`,
			}],
		};
	},
});
