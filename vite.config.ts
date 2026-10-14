import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'

// Resolve Windows cross-drive junction path to prevent Rollup path.relative error
const realRoot = fs.realpathSync(process.cwd())

export default defineConfig({
  root: realRoot,
  base: './',
  plugins: [react()],
})
