/**
 * Compile and Deploy Script for FA2 NFT Contract
 *
 * This script compiles the JsLIGO contract to Michelson and optionally deploys it.
 *
 * Prerequisites:
 * - LIGO must be installed and available in PATH
 *   Install via: brew install ligolang/ligo/ligo (macOS)
 *
 * Environment variables (for deployment):
 * - TEZOS_RPC_URL: RPC endpoint (e.g., https://shadownet.tezos.ecadinfra.com)
 * - ADMIN_PRIVATE_KEY: edsk... key for the admin account
 *
 * Usage:
 *   npm run compile                        # Compile only
 *   npm run deploy                         # Compile and deploy
 *   npm run deploy -- --minter tz1...      # Deploy and add minter
 */

import { execSync } from "child_process";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { TezosToolkit } from "@taquito/taquito";
import { InMemorySigner } from "@taquito/signer";
import { config } from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from parent .env file
config({ path: join(__dirname, "../.env") });

// Parse arguments
const shouldDeploy = process.argv.includes("--deploy");
const minterIndex = process.argv.indexOf("--minter");
const minterAddress = minterIndex !== -1 ? process.argv[minterIndex + 1] : null;

async function compile(): Promise<string> {
	console.log("Compiling NFT contract...");

	const input = join(__dirname, "nft.jsligo");
	const output = join(__dirname, "nft.tz");

	const command = `ligo compile contract "${input}" --output-file "${output}"`;

	execSync(command, {
		stdio: "inherit",
		cwd: __dirname,
	});

	console.log(`Contract compiled to ${output}`);
	return output;
}

async function compileStorage(adminAddress: string): Promise<string> {
	console.log("Compiling initial storage...");

	const input = join(__dirname, "nft.jsligo");

	const command = `ligo compile storage "${input}" 'initial_storage("${adminAddress}")'`;

	const result = execSync(command, {
		cwd: __dirname,
		encoding: "utf-8",
	});

	return result.trim();
}

async function deploy(): Promise<void> {
	const rpcUrl = process.env.TEZOS_RPC_URL;
	const privateKey = process.env.ADMIN_PRIVATE_KEY;

	if (!rpcUrl) {
		throw new Error("TEZOS_RPC_URL environment variable is required");
	}
	if (!privateKey) {
		throw new Error("ADMIN_PRIVATE_KEY environment variable is required");
	}

	// Setup Tezos toolkit
	const Tezos = new TezosToolkit(rpcUrl);
	const signer = await InMemorySigner.fromSecretKey(privateKey);
	Tezos.setProvider({ signer });

	const adminAddress = await signer.publicKeyHash();
	console.log(`Admin address: ${adminAddress}`);

	// Compile contract and storage
	const contractPath = await compile();
	const storageMichelson = await compileStorage(adminAddress);

	// Read compiled Michelson
	const contractMichelson = readFileSync(contractPath, "utf-8");

	console.log("\nDeploying contract...");
	console.log(`RPC: ${rpcUrl}`);

	// Originate contract
	const originationOp = await Tezos.contract.originate({
		code: contractMichelson,
		init: storageMichelson,
	});

	console.log(`Waiting for confirmation...`);
	console.log(`Operation hash: ${originationOp.hash}`);

	await originationOp.confirmation(1);

	const contractAddress = originationOp.contractAddress;
	console.log(`\n✓ Contract deployed successfully!`);
	console.log(`  Address: ${contractAddress}`);
	console.log(`  Admin: ${adminAddress}`);

	// Add minter if specified
	if (minterAddress) {
		console.log(`\nAdding minter: ${minterAddress}...`);
		const contract = await Tezos.contract.at(contractAddress!);
		const addMinterOp = await contract.methodsObject.add_minter(minterAddress).send();
		console.log(`Operation hash: ${addMinterOp.hash}`);
		await addMinterOp.confirmation(1);
		console.log(`✓ Minter added successfully!`);
	}

	console.log(`\nNext steps:`);
	if (!minterAddress) {
		console.log(`  1. Add minter: npm run deploy -- --minter tz1...`);
		console.log(`     Or call: contract.methods.add_minter("tz1...").send()`);
	}
	console.log(`  ${minterAddress ? "1" : "2"}. Set NFT_CONTRACT=${contractAddress} in worker secrets`);
}

async function main(): Promise<void> {
	try {
		if (shouldDeploy) {
			await deploy();
		} else {
			await compile();
		}
	} catch (error) {
		console.error("Error:", error instanceof Error ? error.message : error);
		process.exit(1);
	}
}

main();
