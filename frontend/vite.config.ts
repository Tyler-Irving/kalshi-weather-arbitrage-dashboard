import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on mode (development, production, etc.)
  const env = loadEnv(mode, process.cwd(), '')
  
  // Backend URL for dev proxy (defaults to localhost:8000)
  const backendUrl = env.VITE_DEV_BACKEND_URL || 'http://127.0.0.1:8000'
  const backendWsUrl = env.VITE_DEV_BACKEND_WS_URL || 'ws://127.0.0.1:8000'
  
  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
        },
        '/ws': {
          target: backendWsUrl,
          ws: true,
          changeOrigin: true,
        },
      },
    },
  }
})
