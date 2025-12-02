import { createServer } from "http";
import { fileURLToPath } from "url";
import { join } from "path";
import sirv from "sirv";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export const startWebServer = (port: number) => {
	const distPath = join(__dirname, "../../frontend/dist");
	const serve = sirv(distPath, { single: true });
	createServer(serve).listen(port);
};
