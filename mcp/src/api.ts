import { Router, type Request, type Response, type NextFunction } from 'express';
import { InMemorySigner } from '@taquito/signer';
import { b58Encode, PrefixV2 } from '@taquito/utils';
import { randomBytes } from 'crypto';
import { LiveConfig, configureLiveConfig, resetLiveConfig, type NetworkName, NETWORKS } from './live-config.js';
import { savePendingKey, loadPendingKey, activatePendingKey, saveContract, clearConfig, loadConfig } from './config-store.js';

const log = (msg: string) => console.error(`[tezosx-mcp] ${msg}`);

const LOCALHOST_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/** Reject requests that aren't from localhost (prevents DNS rebinding and CSRF). */
function localhostGuard(req: Request, res: Response, next: NextFunction): void {
	const host = (req.hostname || '').toLowerCase();
	if (!LOCALHOST_HOSTS.has(host)) {
		log(`Blocked request from non-localhost host: ${host}`);
		res.status(403).json({ error: 'Forbidden: API is localhost-only' });
		return;
	}

	// CSRF check: if an Origin header is present, it must also be localhost
	const origin = req.headers.origin;
	if (origin) {
		try {
			const originHost = new URL(origin).hostname.toLowerCase();
			if (!LOCALHOST_HOSTS.has(originHost)) {
				log(`Blocked request with non-localhost origin: ${origin}`);
				res.status(403).json({ error: 'Forbidden: cross-origin requests not allowed' });
				return;
			}
		} catch {
			res.status(403).json({ error: 'Forbidden: malformed Origin header' });
			return;
		}
	}

	next();
}

async function generateKeypair(): Promise<{ address: string; publicKey: string; secretKey: string }> {
	const seed = randomBytes(32);
	const secretKey = b58Encode(seed, PrefixV2.Ed25519Seed);
	const signer = await InMemorySigner.fromSecretKey(secretKey);
	const publicKey = await signer.publicKey();
	const address = await signer.publicKeyHash();
	return { address, publicKey, secretKey };
}

export function createApiRouter(liveConfig: LiveConfig): Router {
	const router = Router();

	// All API routes are localhost-only
	router.use('/api', localhostGuard);

	// Check config status (never exposes private key or filesystem paths)
	router.get('/api/status', (_req, res) => {
		res.json({
			configured: liveConfig.configured,
			spenderAddress: liveConfig.spendingAddress || undefined,
			contractAddress: liveConfig.spendingContract || undefined,
		});
	});

	// Generate keypair server-side, persist as *pending* key, return only public info.
	// Does NOT hot-reload the signer — the old key stays active until /api/activate-key
	// or /api/save-contract promotes the pending key.
	// Idempotent: if a pending key already exists, returns its public info instead of
	// generating a new one (prevents accidental overwrites if the on-chain tx fails).
	router.post('/api/generate-keypair', async (_req, res) => {
		try {
			// Return existing pending key if one hasn't been activated yet
			const existingPending = loadPendingKey();
			if (existingPending) {
				const signer = await InMemorySigner.fromSecretKey(existingPending);
				const publicKey = await signer.publicKey();
				const address = await signer.publicKeyHash();
				log(`Returning existing pending keypair: ${address}`);
				res.json({ address, publicKey });
				return;
			}

			const keypair = await generateKeypair();

			// Save to pending slot (active key stays untouched)
			savePendingKey(keypair.secretKey);
			log(`Generated and saved new pending keypair: ${keypair.address}`);

			// Return only public info — private key stays on server
			res.json({
				address: keypair.address,
				publicKey: keypair.publicKey,
			});
		} catch (error) {
			log(`Failed to generate keypair: ${error instanceof Error ? error.message : error}`);
			res.status(500).json({ error: 'Failed to generate keypair' });
		}
	});

	// Activate the pending key — call this after on-chain setSpender confirms.
	// Promotes pendingPrivateKey → spendingPrivateKey and hot-reloads the signer.
	router.post('/api/activate-key', async (_req, res) => {
		try {
			const pendingKey = loadPendingKey();
			if (!pendingKey) {
				res.status(400).json({ error: 'No pending key found. Generate a keypair first.' });
				return;
			}
			if (!liveConfig.spendingContract) {
				res.status(400).json({ error: 'No contract configured. Save a contract first.' });
				return;
			}

			// Promote pending → active in the store
			activatePendingKey();

			const spenderAddress = await configureLiveConfig(
				liveConfig,
				pendingKey,
				liveConfig.spendingContract,
			);
			log(`LiveConfig signer activated: ${spenderAddress}`);
			res.json({ success: true, spenderAddress });
		} catch (error) {
			log(`Failed to activate key: ${error instanceof Error ? error.message : error}`);
			res.status(500).json({ error: 'Failed to activate key' });
		}
	});

	// Save contract address + network, complete configuration
	router.post('/api/save-contract', async (req, res) => {
		try {
			const { contractAddress, network } = req.body as { contractAddress?: string; network?: string };

			if (!contractAddress || !contractAddress.startsWith('KT1')) {
				res.status(400).json({ error: 'Invalid contract address. Must start with KT1.' });
				return;
			}

			const networkName = (network || 'mainnet') as NetworkName;
			if (!(networkName in NETWORKS)) {
				res.status(400).json({ error: `Invalid network: ${networkName}` });
				return;
			}

			// Save to persistent store
			saveContract(contractAddress, networkName);
			log(`Saved contract address: ${contractAddress} on ${networkName}`);

			// Promote pending key → active (initial deploy flow)
			const pendingKey = loadPendingKey();
			const stored = loadConfig();
			const privateKey = pendingKey || stored.spendingPrivateKey;

			if (!privateKey) {
				res.status(400).json({ error: 'No spending key found. Generate a keypair first.' });
				return;
			}

			if (pendingKey) {
				activatePendingKey();
			}

			const spenderAddress = await configureLiveConfig(
				liveConfig,
				privateKey,
				contractAddress,
				networkName,
			);
			log(`LiveConfig updated: spender=${spenderAddress}, contract=${contractAddress}`);
			res.json({ success: true, spenderAddress });
		} catch (error) {
			log(`Failed to save contract: ${error instanceof Error ? error.message : error}`);
			res.status(500).json({ error: 'Failed to save contract configuration' });
		}
	});

	// Clear all stored config
	router.delete('/api/config', (_req, res) => {
		clearConfig();
		resetLiveConfig(liveConfig);
		log('Config cleared');
		res.json({ success: true });
	});

	return router;
}
