import axios from "axios";
import z from "zod";
import type { LiveConfig } from "../live-config.js";
import type { NetworkName } from "../live-config.js";

const BRIDGE_CONFIG: Record<NetworkName, {
	bridgeContract: string;
	exchangerContract: string;
	fastWithdrawalContract: string;
	smartRollupAddress: string;
}> = {
	mainnet: {
		bridgeContract: "KT1Wj8SUGmnEPFqyahHAcjcNQwe6YGhEXJb5",
		exchangerContract: "KT1CeFqjJRJPNVvhvznQrWfHad2jCiDZ6Lyj",
		fastWithdrawalContract: "KT1BGwyCrnJ6HuEYP7X8Q2UooTdxmEYHiK6j",
		smartRollupAddress: "sr1Ghq66tYK9y3r8CC1Tf8i8m5nxh8nTvZEf",
	},
	shadownet: {
		bridgeContract: "KT19aBsSWvWtvEkbiqReJnD8UzQMWcD8SHUD",
		exchangerContract: "KT1JYZsawXmeArts18nn4uT79tUJc4AGTYgc",
		fastWithdrawalContract: "KT1E1f7ze8FcjbFu4UwnBqNo4kbbS6Zo5Y9W",
		smartRollupAddress: "sr19fMYrr5C4qqvQqQrDSjtP31GcrWjodzvg",
	},
};

const MUTEZ_PER_TEZ = 1_000_000;

const inputSchema = z.object({
	address: z.string().optional().describe(
		"Tezos (tz1/tz2/KT1) or Etherlink (0x) address to check bridge transfers for. Defaults to the spending contract address."
	),
	limit: z.number().optional().describe("Max results per category. Default: 5"),
});

type StatusParams = z.infer<typeof inputSchema>;

interface DepositOp {
	hash: string;
	timestamp: string;
	amount: number;
	status: string;
	parameter?: {
		entrypoint: string;
		value: {
			l2_address: string;
			evm_address: string;
		};
	};
	sender?: { address: string };
}

interface BurnOp {
	hash: string;
	timestamp: string;
	status: string;
	parameter?: {
		entrypoint: string;
		value: {
			address: string;
			ticket: { amount: string };
		};
	};
}

interface FastWithdrawalOp {
	hash: string;
	timestamp: string;
	amount: number;
	status: string;
	parameter?: {
		entrypoint: string;
		value: {
			withdrawal: {
				withdrawal_id: string;
				full_amount: string;
				base_withdrawer: string;
				l2_caller: string;
				timestamp: string;
			};
			service_provider: string;
		};
	};
}

function formatMutez(mutez: number): string {
	return `${(mutez / MUTEZ_PER_TEZ).toFixed(6)} XTZ`;
}

function formatEtherlinkAddress(hex: string): string {
	return `0x${hex}`;
}

export const createBridgeStatusTool = (config: LiveConfig) => ({
	name: "tezos_bridge_status",
	config: {
		title: "Bridge Transfer Status",
		description:
			"Checks the status of Tezos <-> Etherlink bridge transfers for a given address. " +
			"Shows deposits (Tezos -> Etherlink), standard withdrawals (Etherlink -> Tezos), " +
			"and fast withdrawals. Accepts either a Tezos or Etherlink address.",
		inputSchema,
		annotations: {
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: true,
		},
	},

	handler: async (params: any) => {
		params = params as StatusParams;
		const { networkName, spendingContract, tzktApi } = config;

		const bridgeConfig = BRIDGE_CONFIG[networkName];
		if (!bridgeConfig) {
			throw new Error(`Bridge not supported on network: ${networkName}`);
		}

		const limit = params.limit ?? 5;
		const address = params.address ?? spendingContract;

		const isTezosAddress = /^(tz[123]|KT1)[a-zA-Z0-9]{33}$/.test(address);
		const isEtherlinkAddress = /^0x[0-9a-fA-F]{40}$/.test(address);

		if (!isTezosAddress && !isEtherlinkAddress) {
			throw new Error("Invalid address format. Provide a Tezos (tz1/tz2/KT1) or Etherlink (0x) address.");
		}

		const results: string[] = [];
		const tzktBase = tzktApi;

		// Query deposits
		try {
			let depositUrl: string;
			if (isTezosAddress) {
				depositUrl = `${tzktBase}/v1/operations/transactions?target=${bridgeConfig.bridgeContract}&entrypoint=deposit&sender=${address}&limit=${limit}&sort.desc=id`;
			} else {
				const l2Hex = address.slice(2).toLowerCase();
				depositUrl = `${tzktBase}/v1/operations/transactions?target=${bridgeConfig.bridgeContract}&entrypoint=deposit&parameter.l2_address=${l2Hex}&limit=${limit}&sort.desc=id`;
			}

			const { data: deposits } = await axios.get<DepositOp[]>(depositUrl);

			if (deposits.length > 0) {
				results.push(`## Deposits (Tezos → Etherlink): ${deposits.length} found\n`);
				for (const dep of deposits) {
					const amount = formatMutez(dep.amount);
					const l2 = dep.parameter?.value?.l2_address
						? formatEtherlinkAddress(dep.parameter.value.l2_address)
						: "unknown";
					const from = dep.sender?.address ?? "unknown";
					results.push(
						`- **${amount}** → ${l2}\n` +
						`  From: ${from} | ${dep.status} | ${dep.timestamp}\n` +
						`  Hash: ${dep.hash}`
					);
				}
			} else {
				results.push("## Deposits (Tezos → Etherlink): none found");
			}
		} catch {
			results.push("## Deposits: query failed");
		}

		// Query standard withdrawals (exchanger burn) — only for Tezos addresses
		if (isTezosAddress) {
			try {
				const burnUrl = `${tzktBase}/v1/operations/transactions?target=${bridgeConfig.exchangerContract}&entrypoint=burn&parameter.address=${address}&limit=${limit}&sort.desc=id`;
				const { data: burns } = await axios.get<BurnOp[]>(burnUrl);

				if (burns.length > 0) {
					results.push(`\n## Standard Withdrawals (Etherlink → Tezos): ${burns.length} found\n`);
					for (const burn of burns) {
						const ticketAmount = burn.parameter?.value?.ticket?.amount ?? "?";
						const amount = formatMutez(Number(ticketAmount));
						results.push(
							`- **${amount}** → ${address}\n` +
							`  ${burn.status} | ${burn.timestamp}\n` +
							`  Hash: ${burn.hash}`
						);
					}
				} else {
					results.push("\n## Standard Withdrawals (Etherlink → Tezos): none found");
				}
			} catch {
				results.push("\n## Standard Withdrawals: query failed");
			}
		}

		// Query fast withdrawals
		try {
			let fastUrl: string;
			if (isTezosAddress) {
				fastUrl = `${tzktBase}/v1/operations/transactions?target=${bridgeConfig.fastWithdrawalContract}&entrypoint=payout_withdrawal&parameter.withdrawal.base_withdrawer=${address}&limit=${limit}&sort.desc=id`;
			} else {
				const l2Hex = address.slice(2).toLowerCase();
				fastUrl = `${tzktBase}/v1/operations/transactions?target=${bridgeConfig.fastWithdrawalContract}&entrypoint=payout_withdrawal&parameter.withdrawal.l2_caller=${l2Hex}&limit=${limit}&sort.desc=id`;
			}

			const { data: fastOps } = await axios.get<FastWithdrawalOp[]>(fastUrl);

			if (fastOps.length > 0) {
				results.push(`\n## Fast Withdrawals: ${fastOps.length} found\n`);
				for (const fw of fastOps) {
					const w = fw.parameter?.value?.withdrawal;
					const fullAmount = w?.full_amount ? formatMutez(Number(w.full_amount)) : "?";
					const paidAmount = formatMutez(fw.amount);
					const recipient = w?.base_withdrawer ?? "unknown";
					const l2Caller = w?.l2_caller ? formatEtherlinkAddress(w.l2_caller) : "unknown";
					const fee = w?.full_amount
						? formatMutez(Number(w.full_amount) - fw.amount)
						: "?";
					results.push(
						`- **${fullAmount}** (paid: ${paidAmount}, fee: ${fee})\n` +
						`  To: ${recipient} | From L2: ${l2Caller}\n` +
						`  ID: ${w?.withdrawal_id ?? "?"} | ${fw.status} | ${fw.timestamp}\n` +
						`  Hash: ${fw.hash}`
					);
				}
			} else {
				results.push("\n## Fast Withdrawals: none found");
			}
		} catch {
			results.push("\n## Fast Withdrawals: query failed");
		}

		return {
			content: [{
				type: "text" as const,
				text: `# Bridge Status for ${address}\nNetwork: ${networkName}\n\n${results.join("\n")}`,
			}],
		};
	},
});
