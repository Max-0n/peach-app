import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'
import { devQrPlugin } from './vite/devQrPlugin.ts'
import { githubPagesSpaFallback } from './vite/githubPagesPlugin.ts'

const pagesBase = '/peach-app/'

export default defineConfig(({ mode }) => {
  const pages = mode === 'pages'
  const base = pages ? pagesBase : '/'

  return {
    base,
    ...(pages
      ? {
          build: {
            outDir: 'docs',
            emptyOutDir: true,
          },
        }
      : {}),
    plugins: [
      devQrPlugin(),
      react(),
      tailwindcss(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png'],
        manifest: {
          name: 'Peach',
          short_name: 'Peach',
          description: 'A calm, private space for understanding your cycle.',
          theme_color: '#f3eadf',
          background_color: '#f3eadf',
          display: 'standalone',
          start_url: base,
          scope: base,
          lang: 'en',
          icons: [
            {
              src: `${base}icon-192.png`,
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: `${base}icon-512.png`,
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: `${base}favicon.svg`,
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any',
            },
          ],
        },
        injectManifest: {
          globPatterns: ['**/*.{js,css,html,svg,ico,png,webp,woff2}'],
        },
        devOptions: {
          enabled: false,
        },
      }),
      ...(pages ? [githubPagesSpaFallback('docs')] : []),
    ],
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      css: true,
      include: ['src/**/*.test.{ts,tsx}'],
    },
  }
})
