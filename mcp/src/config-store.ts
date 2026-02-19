import Conf from 'conf';

interface StoredConfig {
	spendingPrivateKey: string;
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

export function savePrivateKey(key: string): void {
	store.set('spendingPrivateKey', key);
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
