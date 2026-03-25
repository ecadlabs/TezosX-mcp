import z from "zod";
import { ensureRevealed } from "./reveal_account.js";
import { calculateFeeRebate, type LiveConfig, type NetworkName } from "../live-config.js";

// Constants
const MUTEZ_PER_TEZ = 1_000_000;
const CONFIRMATIONS_TO_WAIT = 3;

// Bridge configuration per network
// bridge contract = the evm_bridge.mligo contract that handles deposits
// exchanger = the exchanger.mligo contract (not called directly by users)
// smartRollupAddress = passed as evm_address param to the bridge deposit entrypoint
const BRIDGE_CONFIG: Record<NetworkName, {
	smartRollupAddress: string;
	bridgeContractAddress: string;
}> = {
	mainnet: {
		smartRollupAddress: "sr1Ghq66tYK9y3r8CC1Tf8i8m5nxh8nTvZEf",
		bridgeContractAddress: "KT1Wj8SUGmnEPFqyahHAcjcNQwe6YGhEXJb5",
	},
	shadownet: {
		smartRollupAddress: "sr19fMYrr5C4qqvQqQrDSjtP31GcrWjodzvg",
		bridgeContractAddress: "KT19aBsSWvWtvEkbiqReJnD8UzQMWcD8SHUD",
	},
};

const inputSchema = z.object({
	amount: z.number().describe("The amount of XTZ to bridge to Etherlink."),
	etherlinkAddress: z.string().describe("The Etherlink (0x) address to receive the bridged XTZ."),
});

type BridgeParams = z.infer<typeof inputSchema>;

// Cache the last-verified spender so we only hit the chain when config changes
let verifiedSpender: { address: string; contract: string } | null = null;

export const createBridgeToEtherlinkTool = (config: LiveConfig) => ({
	name: "tezos_bridge_to_etherlink",
	config: {
		title: "Bridge XTZ to Etherlink",
		description:
			"Bridges XTZ from Tezos to Etherlink via the native bridge. " +
			"Sends XTZ from the spending contract through the Tezos-Etherlink bridge to the specified Etherlink address. " +
			"The bridged XTZ will appear as native tokens on Etherlink after the rollup processes the deposit.",
		inputSchema,
		annotations: {
			readOnlyHint: false,
			destructiveHint: true,
			idempotentHint: false,
			openWorldHint: true,
		},
	},

	handler: async (params: any) => {
		params = params as BridgeParams;
		const { Tezos, spendingContract, spendingAddress, networkName } = config;

		const bridgeConfig = BRIDGE_CONFIG[networkName];
		if (!bridgeConfig) {
			throw new Error(`Bridge not supported on network: ${networkName}`);
		}

		// Validate Etherlink address format
		if (!/^0x[0-9a-fA-F]{40}$/.test(params.etherlinkAddress)) {
			throw new Error("Invalid Etherlink address. Must be a 0x-prefixed, 40 hex character address.");
		}

		const amountMutez = Math.floor(params.amount * MUTEZ_PER_TEZ);
		if (amountMutez <= 0) {
			throw new Error("Amount must be greater than 0.");
		}

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

		// Check spending contract has enough for the bridge amount
		const contractBalance = await Tezos.tz.getBalance(spendingContract);
		if (contractBalance.toNumber() < amountMutez) {
			throw new Error(
				`Insufficient spending contract balance. ` +
				`Requested: ${amountMutez} mutez, Available: ${contractBalance.toNumber()} mutez`
			);
		}

		// Ensure account is revealed before estimating
		await ensureRevealed(Tezos);

		// Step 1: Fund the spender from the spending contract
		// The spender needs the bridge amount + fees to execute the bridge deposit
		const spenderBalance = await Tezos.tz.getBalance(spendingAddress);
		const spenderMutez = spenderBalance.toNumber();
		const feeRebate = calculateFeeRebate(spenderMutez);

		const spendingContractInstance = await Tezos.contract.at(spendingContract);
		const fundCall = spendingContractInstance.methodsObject.spend({
			recipient: spendingAddress,
			amount: amountMutez,
			fee_rebate: feeRebate,
		});

		const fundOp = await fundCall.send();
		await fundOp.confirmation(CONFIRMATIONS_TO_WAIT);

		// Step 2: Call the bridge contract's deposit entrypoint directly
		// The deposit entrypoint takes:
		//   evm_address: the smart rollup address (sr1...)
		//   l2_address: the Etherlink receiver as hex bytes (without 0x prefix)
		// XTZ is sent along with the call as the amount to bridge
		const bridgeContract = await Tezos.contract.at(bridgeConfig.bridgeContractAddress);
		const l2AddressBytes = params.etherlinkAddress.slice(2).toLowerCase();

		const depositCall = bridgeContract.methodsObject.deposit({
			evm_address: bridgeConfig.smartRollupAddress,
			l2_address: l2AddressBytes,
		});

		const depositOp = await depositCall.send({ amount: amountMutez, mutez: true });
		await depositOp.confirmation(CONFIRMATIONS_TO_WAIT);

		const tzktBase = config.tzktApi.replace('api.', '').replace('/v1', '');
		const tzktUrl = `${tzktBase}/${depositOp.hash}`;

		return {
			content: [{
				type: "text" as const,
				text: `Bridged ${params.amount} XTZ to Etherlink address ${params.etherlinkAddress}\n` +
					`Tezos operation: ${tzktUrl}\n` +
					`The deposit will appear on Etherlink after the rollup processes it (typically a few minutes).`,
			}],
		};
	},
});
