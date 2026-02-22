import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,         // Expose to all network interfaces
    port: 5173,         // Ensure this matches your Dockerfile EXPOSE and Compose ports
    watch: {
      usePolling: true, // Required for Hot Reloading to work inside Docker on Windows/macOS
    },
  },
})

