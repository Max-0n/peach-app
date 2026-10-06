import os from 'node:os'

export function getLanIPv4(): string | undefined {
  for (const interfaces of Object.values(os.networkInterfaces())) {
    if (interfaces === undefined) {
      continue
    }
    for (const iface of interfaces) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address
      }
    }
  }
  return undefined
}
