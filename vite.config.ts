import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

export default defineConfig({
  plugins: [uni()],
  server: {
    port: 3000,
    host: '0.0.0.0'
  },
  build: {
    target: 'es2015',
    cssCodeSplit: false,
    chunkSizeWarningLimit: 500
  }
})
