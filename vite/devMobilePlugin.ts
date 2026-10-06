import type { Plugin } from 'vite'

const clearPwaCachesScript = `
<script type="module">
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(
      registrations.map((registration) => registration.unregister()),
    )
  }
  if ('caches' in window) {
    const keys = await caches.keys()
    await Promise.all(keys.map((key) => caches.delete(key)))
  }
</script>`

export function devMobilePlugin(): Plugin {
  return {
    name: 'dev-mobile',
    apply: 'serve',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return html.replace(
          '<script type="module" src="/src/main.tsx"></script>',
          `${clearPwaCachesScript}\n    <script type="module" src="/src/main.tsx"></script>`,
        )
      },
    },
  }
}
