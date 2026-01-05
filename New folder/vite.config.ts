import { defineConfig, loadEnv } from 'vite'; // Added loadEnv here
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // 1. Create the 'env' variable by loading it from the system
  const env = loadEnv(mode, process.cwd(), '');
  
  // 2. Now 'env' is defined, so this line will work perfectly!
  const apiKey = env.VITE_GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
  
  return {
    plugins: [react()],
    define: {
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