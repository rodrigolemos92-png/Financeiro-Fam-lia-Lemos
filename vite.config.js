import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, existsSync } from 'node:fs'

// Como o projeto não usa pastas, copiamos os ícones/manifest da raiz para o site publicado.
const STATIC = ['manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png']
const copyStatic = () => ({
  name: 'copy-static-root-files',
  closeBundle() {
    for (const f of STATIC) if (existsSync(f)) copyFileSync(f, `dist/${f}`)
  },
})

export default defineConfig({ plugins: [react(), copyStatic()] })
