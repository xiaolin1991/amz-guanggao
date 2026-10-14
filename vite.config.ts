import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'

// If Windows junction moved directory to another drive (e.g. C: -> F:),
// align process.cwd() with the real filesystem location to prevent cross-drive path.relative errors in Rollup/esbuild
try {
  const realCwd = fs.realpathSync(process.cwd())
  if (process.cwd() !== realCwd) {
    process.chdir(realCwd)
  }
} catch (e) {
  // Ignore fallback
}

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Allow access via localhost or local network
    port: 5173,
    strictPort: false
  }
})
