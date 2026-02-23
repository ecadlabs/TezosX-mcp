import { InMemorySigner } from '@taquito/signer'
import { b58Encode, PrefixV2 } from '@taquito/utils'

export interface GeneratedKeypair {
  address: string
  publicKey: string
  secretKey: string
}

export async function generateKeypairLocally(): Promise<GeneratedKeypair> {
  const seed = new Uint8Array(32)
  crypto.getRandomValues(seed)
  const secretKey = b58Encode(seed, PrefixV2.Ed25519Seed)
  const signer = await InMemorySigner.fromSecretKey(secretKey)
  const publicKey = await signer.publicKey()
  const address = await signer.publicKeyHash()
  return { address, publicKey, secretKey }
}
