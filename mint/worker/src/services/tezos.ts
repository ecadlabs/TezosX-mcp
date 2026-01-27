import { TezosToolkit } from "@taquito/taquito";
import { InMemorySigner } from "@taquito/signer";
import { stringToBytes } from "@taquito/utils";
import type { Env, MintResult } from "../types/index.js";

interface NFTStorage {
	next_token_id: BigNumber;
}

let tezosInstance: TezosToolkit | null = null;

/**
 * Initialize and return a TezosToolkit instance with the minter signer
 */
export async function getTezos(env: Env): Promise<TezosToolkit> {
	if (tezosInstance) {
		return tezosInstance;
	}

	const Tezos = new TezosToolkit(env.TEZOS_RPC_URL);
	const signer = await InMemorySigner.fromSecretKey(env.MINTER_PRIVATE_KEY);
	Tezos.setProvider({ signer });

	tezosInstance = Tezos;
	return Tezos;
}

/**
 * Get the next token ID from the NFT contract
 */
export async function getNextTokenId(env: Env): Promise<number> {
	const Tezos = await getTezos(env);
	const contract = await Tezos.contract.at(env.NFT_CONTRACT);
	const storage = await contract.storage<NFTStorage>();
	return storage.next_token_id.toNumber();
}

/**
 * Mint an NFT to the recipient with the given metadata URI
 */
export async function mintNFT(
	env: Env,
	recipient: string,
	metadataUri: string
): Promise<MintResult> {
	const Tezos = await getTezos(env);
	const contract = await Tezos.contract.at(env.NFT_CONTRACT);

	// Get current token ID before minting
	const storage = await contract.storage<NFTStorage>();
	const tokenId = storage.next_token_id.toNumber();

	// Convert metadata URI string to bytes (raw UTF-8, not packed)
	// This is required for TZIP-12/TZIP-21 compliance
	const metadataBytes = stringToBytes(metadataUri);

	// Call mint entrypoint with bytes
	const op = await contract.methodsObject
		.mint({ recipient, metadata_uri: metadataBytes })
		.send();

	// Wait for confirmation
	await op.confirmation(1);

	return {
		tokenId,
		opHash: op.hash,
		metadataUri,
	};
}

/**
 * Validate a Tezos address format
 */
export function isValidTezosAddress(address: string): boolean {
	return /^(tz1|tz2|tz3|KT1)[1-9A-HJ-NP-Za-km-z]{33}$/.test(address);
}
