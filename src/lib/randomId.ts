function bytesToUuidV4(bytes: Uint8Array): string {
  bytes[6] = (bytes[6]! & 0x0f) | 0x40
  bytes[8] = (bytes[8]! & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/** UUID v4; works on HTTP LAN dev (no secure context) where randomUUID is missing. */
export function randomUUID(): string {
  const cryptoObj = globalThis.crypto
  if (cryptoObj !== undefined) {
    if (typeof cryptoObj.randomUUID === 'function') {
      return cryptoObj.randomUUID()
    }
    if (typeof cryptoObj.getRandomValues === 'function') {
      const bytes = new Uint8Array(16)
      cryptoObj.getRandomValues(bytes)
      return bytesToUuidV4(bytes)
    }
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/gu, (char) => {
    const random = (Math.random() * 16) | 0
    const value = char === 'x' ? random : (random & 0x3) | 0x8
    return value.toString(16)
  })
}
