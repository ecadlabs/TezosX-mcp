import { TezosToolkit } from "@taquito/taquito";
import { WalletConfig } from "../index.js";
import { createCreateX402PaymentTool } from "./create_x402_payment.js";
import { createFetchWithX402Tool } from "./fetch_with_x402.js";
import { createGetAddressesTool } from "./get_addresses.js";
import { createGetBalanceTool } from "./get_balance.js";
import { createGetLimitsTool } from "./get_limits.js";
import { createGetOperationHistoryTool } from "./get_operation_history.js";
import { createParseX402RequirementsTool } from "./parse_x402_requirements.js";
import { createRevealAccountTool } from "./reveal_account.js";
import { createSendXtzTool } from "./send_xtz.js";
import { createDepositXtzTool } from "./deposit_xtz.js";
import { createGetDashboardTool } from "./get_dashboard.js";

const getNotConfiguredMessage = () => `Wallet not configured. Please set the following environment variables and restart the MCP server:

1. SPENDING_PRIVATE_KEY - Your spending key (starts with edsk, spsk, or p2sk)
2. SPENDING_CONTRACT - Your spending contract address (starts with KT1)

To get started:
1. Open the dashboard at http://localhost:${process.env.WEB_PORT || '13205'}
2. Connect your wallet and deploy a spending contract
3. Add the environment variables to your MCP client configuration
4. Restart the MCP server`;

const notConfiguredResponse = () => ({
	content: [{
		type: "text" as const,
		text: getNotConfiguredMessage()
	}]
});

// Wraps a tool's handler to check config before execution
const withConfigCheck = <T extends { name: string; config: any; handler: (...args: any[]) => Promise<any> }>(
	tool: T,
	walletConfig: WalletConfig
): T => ({
	...tool,
	handler: async (...args: any[]) => {
		if (!walletConfig) {
			return notConfiguredResponse();
		}
		return tool.handler(...args);
	}
});

export const createTools = (walletConfig: WalletConfig, tzktApi: string, http: boolean) => {
	// Create a mock Tezos toolkit for tool creation when config is missing
	// The actual handlers will be blocked by withConfigCheck
	const Tezos = walletConfig?.Tezos ?? {} as TezosToolkit;
	const spendingContract = walletConfig?.spendingContract ?? '';
	const spendingAddress = walletConfig?.spendingAddress ?? '';

	const tools = [
		createCreateX402PaymentTool(Tezos),
		createFetchWithX402Tool(Tezos),
		createGetAddressesTool(Tezos, spendingContract),
		createGetBalanceTool(Tezos, spendingContract, spendingAddress),
		createGetLimitsTool(Tezos, spendingContract),
		createGetOperationHistoryTool(spendingContract, tzktApi),
		createParseX402RequirementsTool(),
		createRevealAccountTool(Tezos),
		createSendXtzTool(Tezos, spendingContract, spendingAddress),
		createDepositXtzTool(Tezos, spendingContract, spendingAddress),
	];

	if (!http) {
		tools.push(createGetDashboardTool(spendingContract));
	}

	// Wrap all tools with config check
	return tools.map(tool => withConfigCheck(tool, walletConfig));
};
