import express, { type Router } from "express";
import { fileURLToPath } from "url";
import { join } from "path";
import sirv from "sirv";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export const startWebServer = (port: number, apiRouter?: Router) => {
	const app = express();
	app.use(express.json());

	// API routes (config endpoints)
	if (apiRouter) {
		app.use(apiRouter);
	}

	// Static files + SPA fallback
	const distPath = join(__dirname, "../frontend/dist");
	app.use(sirv(distPath, { single: true }));

	let retries = 0;
	const maxRetries = 5;
	const retryDelay = 1000;
	let activeServer: ReturnType<typeof app.listen> | null = null;

	const tryListen = () => {
		const server = app.listen(port);
		server.on("error", (err: NodeJS.ErrnoException) => {
			if (err.code === "EADDRINUSE" && retries < maxRetries) {
				retries++;
				console.error(`[tezosx-mcp] Port ${port} in use, retrying (${retries}/${maxRetries})...`);
				setTimeout(tryListen, retryDelay);
			} else if (err.code === "EADDRINUSE") {
				console.error(`[tezosx-mcp] Port ${port} still in use after ${maxRetries} retries, frontend dashboard unavailable`);
			} else {
				console.error(`[tezosx-mcp] Web server error:`, err.message);
			}
		});
		server.on("listening", () => {
			activeServer = server;
			console.error(`[tezosx-mcp] Dashboard running on http://localhost:${port}`);
		});
	};

	// Ensure the server is fully closed before the process exits
	const shutdown = () => {
		if (activeServer) {
			activeServer.closeAllConnections();
			activeServer.close();
			activeServer = null;
		}
	};
	process.on("SIGTERM", () => { shutdown(); process.exit(0); });
	process.on("SIGINT", () => { shutdown(); process.exit(0); });

	tryListen();
};
