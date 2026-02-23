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
	const maxRetries = 3;

	const tryListen = () => {
		const server = app.listen(port);
		server.on("error", (err: NodeJS.ErrnoException) => {
			if (err.code === "EADDRINUSE" && retries < maxRetries) {
				retries++;
				console.error(`[tezosx-mcp] Port ${port} in use, retrying (${retries}/${maxRetries})...`);
				setTimeout(tryListen, 500);
			} else if (err.code === "EADDRINUSE") {
				console.error(`[tezosx-mcp] Port ${port} in use, frontend dashboard unavailable`);
			} else {
				console.error(`[tezosx-mcp] Web server error:`, err.message);
			}
		});
		server.on("listening", () => {
			const shutdown = () => server.close();
			process.on("SIGTERM", shutdown);
			process.on("SIGINT", shutdown);
			process.on("exit", shutdown);
		});
	};

	tryListen();
};
