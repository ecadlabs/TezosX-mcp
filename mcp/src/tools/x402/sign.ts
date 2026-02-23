import { TezosToolkit, OpKind } from "@taquito/taquito";
import { LocalForger, ForgeParams } from "@taquito/local-forging";
import { X402PaymentPayload } from "./types.js";
import { calculateFeeRebate } from "../../live-config.js";

export interface SignPaymentParams {
	network: string;
	amount: number;
	recipient: string;
	spendingContract: string;
}

export interface SignedPayment {
	payload: X402PaymentPayload;
	base64: string;
}

export async function signX402Payment(
	Tezos: TezosToolkit,
	params: SignPaymentParams
): Promise<SignedPayment> {
	const { network, amount, recipient, spendingContract } = params;

	// Get source address and public key from the signer
	let source: string;
	let publicKey: string;

	try {
		source = await Tezos.signer.publicKeyHash();
	} catch (error) {
		throw new Error(`Failed to get source address from signer. Is SPENDING_PRIVATE_KEY set correctly? Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}

	try {
		publicKey = await Tezos.signer.publicKey();
	} catch (error) {
		throw new Error(`Failed to get public key from signer. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}

	// Validate we got proper values
	if (!source.startsWith('tz1') && !source.startsWith('tz2') && !source.startsWith('tz3')) {
		throw new Error(`Invalid source address format: ${source}`);
	}
	if (!publicKey.startsWith('edpk') && !publicKey.startsWith('sppk') && !publicKey.startsWith('p2pk')) {
		throw new Error(`Invalid public key format: ${publicKey}`);
	}

	// Calculate fee rebate to keep spender funded for gas
	const spenderBalance = await Tezos.tz.getBalance(source);
	const spenderMutez = spenderBalance.toNumber();
	const feeRebate = calculateFeeRebate(spenderMutez);

	// Build contract call via Taquito to get properly encoded parameters
	const contract = await Tezos.contract.at(spendingContract);
	const contractCall = contract.methodsObject.spend({
		recipient,
		amount,
		fee_rebate: feeRebate,
	});

	// Estimate gas, storage, and fees
	const estimate = await Tezos.estimate.contractCall(contractCall);

	// Get the encoded parameters from the contract call
	const transferParams = contractCall.toTransferParams();

	// Get the current block hash for the branch
	const block = await Tezos.rpc.getBlockHeader();
	const branch = block.hash;

	// Get the counter for the source account
	const contractInfo = await Tezos.rpc.getContract(source);
	if (!contractInfo) {
		throw new Error(`Failed to get contract info for ${source}. Account may not exist on chain.`);
	}
	const nextCounter = (parseInt(contractInfo.counter || "0") + 1).toString();

	// Build the contract call operation (funds come from the contract, not the spender)
	const operation: ForgeParams = {
		branch,
		contents: [
			{
				kind: OpKind.TRANSACTION,
				source,
				fee: estimate.suggestedFeeMutez.toString(),
				counter: nextCounter,
				gas_limit: estimate.gasLimit.toString(),
				storage_limit: estimate.storageLimit.toString(),
				amount: "0",
				destination: spendingContract,
				parameters: transferParams.parameter,
			}
		]
	};

	// Forge the operation using LocalForger
	const forger = new LocalForger();
	const forgedBytes = await forger.forge(operation);

	// Sign the operation (with generic operation watermark 0x03)
	const signature = await Tezos.signer.sign(forgedBytes, new Uint8Array([3]));

	// Create x402 payload in the facilitator-compatible format
	const payload: X402PaymentPayload = {
		x402Version: 1,
		scheme: "exact-tezos",
		network,
		asset: "XTZ",
		payload: {
			operationBytes: forgedBytes,
			signature: signature.prefixSig,
			publicKey,
			source,
		}
	};

	// Base64 encode the payload
	const base64 = Buffer.from(JSON.stringify(payload)).toString("base64");

	return {
		payload,
		base64,
	};
}
