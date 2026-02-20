import type { LiveConfig } from "../live-config.js";
import { createCreateX402PaymentTool } from "./create_x402_payment.js";
import { createFetchWithX402Tool } from "./fetch_with_x402.js";
import { createGetAddressesTool } from "./get_addresses.js";
import { createGetBalanceTool } from "./get_balance.js";
import { createGetLimitsTool } from "./get_limits.js";
import { createGetOperationHistoryTool } from "./get_operation_history.js";
import { createParseX402RequirementsTool } from "./parse_x402_requirements.js";
import { createRevealAccountTool } from "./reveal_account.js";
import { createSendXtzTool } from "./send_xtz.js";
import { createGetDashboardTool } from "./get_dashboard.js";

const getNotConfiguredMessage = () => `Wallet not configured.

To get started:
1. Open the dashboard at http://localhost:${process.env.WEB_PORT || '13205'}
2. Connect your wallet and deploy a spending contract
3. The MCP server will be configured automatically — no manual setup needed`;

const notConfiguredResponse = () => ({
	content: [{
		type: "text" as const,
		text: getNotConfiguredMessage()
	}]
});

// Wraps a tool's handler to check config before execution
const withConfigCheck = <T extends { name: string; config: any; handler: (...args: any[]) => Promise<any> }>(
	tool: T,
	liveConfig: LiveConfig
): T => ({
	...tool,
	handler: async (...args: any[]) => {
		if (!liveConfig.configured) {
			return notConfiguredResponse();
		}
		return tool.handler(...args);
	}
});

export const createTools = (liveConfig: LiveConfig, http: boolean) => {
	const tools = [
		createCreateX402PaymentTool(liveConfig),
		createFetchWithX402Tool(liveConfig),
		createGetAddressesTool(liveConfig),
		createGetBalanceTool(liveConfig),
		createGetLimitsTool(liveConfig),
		createGetOperationHistoryTool(liveConfig),
		createParseX402RequirementsTool(),
		createRevealAccountTool(liveConfig),
		createSendXtzTool(liveConfig),
	];

	if (!http) {
		tools.push(createGetDashboardTool(liveConfig));
	}

	// Wrap all tools with config check
	return tools.map(tool => withConfigCheck(tool, liveConfig));
};
