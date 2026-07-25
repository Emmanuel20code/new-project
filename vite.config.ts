import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  root: process.cwd(), // Explicitly set root to current directory
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: 'index.html' // Explicitly set input
    }
  }
})
