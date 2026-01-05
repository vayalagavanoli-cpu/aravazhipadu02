
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(() => {
  // Obtain the API key exclusively from the process.env.API_KEY environment variable.
  // We use type casting to avoid potential 'Process' type definition errors in certain environments.
  const apiKey = env.VITE_GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || env.API_KEY || process.env.API_KEY || '';
  
  return {
    plugins: [react()],
    define: {
      // Globally replaces process.env.API_KEY in the frontend code with the value from the build environment.
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
            'genai': ['@google/genai'],
            'utils': ['xlsx', 'lucide-react']
          }
        }
      }
    }
  };
});
