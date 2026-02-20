import Conf from 'conf';

interface StoredConfig {
	spendingPrivateKey: string;
	pendingPrivateKey: string;
	spendingContract: string;
	network: string;
}

const store = new Conf<StoredConfig>({
	projectName: 'tezosx-mcp',
	configFileMode: 0o600,
});

export function loadConfig(): Partial<StoredConfig> {
	const spendingPrivateKey = store.get('spendingPrivateKey');
	const spendingContract = store.get('spendingContract');
	const network = store.get('network');
	if (!spendingPrivateKey && !spendingContract && !network) return {};
	return { spendingPrivateKey, spendingContract, network };
}

export function savePendingKey(key: string): void {
	store.set('pendingPrivateKey', key);
}

export function loadPendingKey(): string | undefined {
	return store.get('pendingPrivateKey') || undefined;
}

/** Promote the pending key to active and clear the pending slot. */
export function activatePendingKey(): string {
	const key = store.get('pendingPrivateKey');
	if (!key) throw new Error('No pending key to activate');
	store.set('spendingPrivateKey', key);
	store.delete('pendingPrivateKey');
	return key;
}

export function saveContract(address: string, network: string): void {
	store.set('spendingContract', address);
	store.set('network', network);
}

export function clearConfig(): void {
	store.clear();
}

export function getStorePath(): string {
	return store.path;
}
