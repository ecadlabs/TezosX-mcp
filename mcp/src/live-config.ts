import { TezosToolkit } from "@taquito/taquito";
import { InMemorySigner } from "@taquito/signer";

export interface LiveConfig {
	Tezos: TezosToolkit;
	spendingContract: string;
	spendingAddress: string;
	tzktApi: string;
	configured: boolean;
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
	}
	config.spendingContract = '';
	config.spendingAddress = '';
	config.configured = false;
}
