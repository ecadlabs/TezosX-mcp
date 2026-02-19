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

	app.listen(port);
};
