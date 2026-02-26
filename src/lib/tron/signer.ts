/**
 * Browser-safe TRON transaction signing.
 * Uses elliptic (secp256k1) — pure JS, no Node.js APIs needed.
 * The private key NEVER leaves the browser.
 */

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/, '')
  const bytes = new Uint8Array(clean.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

export async function signTronTransaction(unsignedTx: any, privateKey: string): Promise<any> {
  // Dynamic import so this module is never SSR'd
  const { ec: EC } = await import('elliptic')
  const ec = new EC('secp256k1')

  const cleanKey = privateKey.replace(/^0x/, '')
  const keyPair = ec.keyFromPrivate(cleanKey, 'hex')
  const txBytes = hexToBytes(unsignedTx.txID)

  const sig = keyPair.sign(txBytes, { canonical: true })

  const r = sig.r.toString(16).padStart(64, '0')
  const s = sig.s.toString(16).padStart(64, '0')
  const v = (sig.recoveryParam! + 27).toString(16).padStart(2, '0')

  return {
    ...unsignedTx,
    signature: [r + s + v],
  }
}
