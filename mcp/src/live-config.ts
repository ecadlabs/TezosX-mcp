import { TezosToolkit } from "@taquito/taquito";
import { InMemorySigner } from "@taquito/signer";

export interface LiveConfig {
	Tezos: TezosToolkit;
	spendingContract: string;
	spendingAddress: string;
	tzktApi: string;
	networkName: NetworkName;
	configured: boolean;
}

// Spender fee rebate thresholds (in mutez)
const SPENDER_TOP_UP_THRESHOLD = 250_000; // 0.25 XTZ — rebate when below this
const SPENDER_TOP_UP_TARGET = 500_000;    // 0.5 XTZ — rebate up to this level

/**
 * Calculate the fee rebate amount to keep the spender address funded for gas.
 * Returns 0 if the spender has sufficient balance, otherwise the amount needed
 * to bring the balance up to the target level.
 */
export function calculateFeeRebate(spenderBalanceMutez: number): number {
	if (spenderBalanceMutez < SPENDER_TOP_UP_THRESHOLD) {
		return SPENDER_TOP_UP_TARGET - spenderBalanceMutez;
	}
	return 0;
}

export const NETWORKS = {
	mainnet: {
		rpcUrl: 'https://mainnet.tezos.ecadinfra.com',
		tzktApi: 'https://api.tzkt.io',
	},
	shadownet: {
		rpcUrl: 'https://shadownet.tezos.ecadinfra.com',
		tzktApi: 'https://api.shadownet.tzkt.io',
	},
} as const;

export type NetworkName = keyof typeof NETWORKS;

/**
 * Creates an unconfigured LiveConfig pointed at the given network.
 */
export function createLiveConfig(networkName: NetworkName): LiveConfig {
	const network = NETWORKS[networkName];
	return {
		Tezos: new TezosToolkit(network.rpcUrl),
		spendingContract: '',
		spendingAddress: '',
		tzktApi: network.tzktApi,
		networkName,
		configured: false,
	};
}

/**
 * Mutates the LiveConfig in-place with a new private key and contract address.
 * Returns the derived spender address.
 */
export async function configureLiveConfig(
	config: LiveConfig,
	privateKey: string,
	spendingContract: string,
	networkName?: NetworkName,
): Promise<string> {
	if (networkName) {
		const network = NETWORKS[networkName];
		config.Tezos = new TezosToolkit(network.rpcUrl);
		config.tzktApi = network.tzktApi;
		config.networkName = networkName;
	}

	const signer = await InMemorySigner.fromSecretKey(privateKey);
	config.Tezos.setSignerProvider(signer);
	config.spendingAddress = await config.Tezos.signer.publicKeyHash();
	config.spendingContract = spendingContract;
	config.configured = true;

	return config.spendingAddress;
}

/**
 * Resets the LiveConfig to unconfigured state.
 */
export function resetLiveConfig(config: LiveConfig, networkName?: NetworkName): void {
	const rpcUrl = networkName ? NETWORKS[networkName].rpcUrl : config.Tezos.rpc.getRpcUrl();
	config.Tezos = new TezosToolkit(rpcUrl);
	if (networkName) {
		config.tzktApi = NETWORKS[networkName].tzktApi;
		config.networkName = networkName;
	}
	config.spendingContract = '';
	config.spendingAddress = '';
	config.configured = false;
}
