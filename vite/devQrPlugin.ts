import qrcode from 'qrcode-terminal'
import type { Plugin } from 'vite'

export function devQrPlugin(): Plugin {
  return {
    name: 'dev-qr',
    apply: 'serve',
    configureServer(server) {
      const printUrls = server.printUrls.bind(server)
      server.printUrls = () => {
        printUrls()
        const url = server.resolvedUrls?.network[0]
        if (url === undefined) {
          console.log(
            '\n  No LAN URL (use `vite --host` / `bun start` to show a phone QR).\n',
          )
          return
        }
        console.log('\n  Scan on your phone:\n')
        qrcode.generate(url, { small: true })
        console.log(`\n  ${url}\n`)
      }
    },
  }
}
