import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Dynamically read the exact installed onnxruntime-web package version
let ortVersion = '1.27.0'
try {
  const ortPkgPath = path.resolve(__dirname, 'node_modules/onnxruntime-web/package.json')
  const ortPkg = JSON.parse(fs.readFileSync(ortPkgPath, 'utf-8'))
  ortVersion = ortPkg.version
} catch {
  // fallback if node_modules not yet populated
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __ORT_VERSION__: JSON.stringify(ortVersion),
  },
  server: {
    headers: {
      // Required for SharedArrayBuffer (WASM multi-threading + WebGPU)
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  optimizeDeps: {
    exclude: ['onnxruntime-web'],
  },
  assetsInclude: ['**/*.onnx'],
})
