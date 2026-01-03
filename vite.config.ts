import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load environment variables from .env files
  const env = loadEnv(mode, process.cwd(), '');
  
  // Identify the API key from various potential sources (VITE_ prefix or direct)
  const apiKey = env.VITE_GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || env.API_KEY || process.env.API_KEY || '';
  
  return {
    plugins: [react()],
    define: {
      // This globally replaces process.env.API_KEY with the actual key string during build
      'process.env.API_KEY': JSON.stringify(apiKey)
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor': ['react', 'react-dom'],
            'genai': ['@google/generative-ai'],
            'utils': ['xlsx', 'lucide-react']
          }
        }
      }
    }
  };
});
