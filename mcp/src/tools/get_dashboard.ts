import z from "zod";
import { DEFAULT_WEB_PORT } from '../index.js'
import type { LiveConfig } from "../live-config.js";

export const createGetDashboardTool = (config: LiveConfig) => ({
	name: "tezos_get_dashboard",
	config: {
		title: "Get Contract Dashboard",
		description:
			"Returns a link to the dashboard where the user can configure their contracts spending limits, spending keys, and deploy a new spending contract.",
		inputSchema: z.object({}),
		annotations: {
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async () => {
		const port = process.env.WEB_PORT || DEFAULT_WEB_PORT;
		const network = process.env.TEZOS_NETWORK || 'shadownet';
		const url = `http://localhost:${port}?contract=${config.spendingContract}&network=${network}`

		return {
			content: [
				{
					type: "text" as const,
					text: url,
				},
			],
		};
	},
});