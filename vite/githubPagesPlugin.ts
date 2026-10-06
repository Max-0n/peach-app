import { copyFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'

export function githubPagesSpaFallback(outDir: string): Plugin {
  return {
    name: 'github-pages-spa',
    apply: 'build',
    closeBundle() {
      const directory = path.resolve(outDir)
      copyFileSync(
        path.join(directory, 'index.html'),
        path.join(directory, '404.html'),
      )
      writeFileSync(path.join(directory, '.nojekyll'), '')
    },
  }
}
