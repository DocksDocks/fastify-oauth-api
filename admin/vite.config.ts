import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// https://vite.dev/config/
export default defineConfig(() => {
  return {
    plugins: [tailwindcss(), react()],
    base: '/admin/',
    envDir: '../', // Load .env files from project root (parent directory)
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: Number(process.env.VITE_PORT) || 3000,
      allowedHosts: [
        '.ngrok-free.app',  // Allow all ngrok free tier hosts
        '.ngrok.io',        // Allow ngrok paid tier custom domains
        '.ngrok.app',       // Allow ngrok Hobbyist tier custom domains (e.g., growup.ngrok.app)
      ],
      proxy: {
        '/api': {
          target: process.env.VITE_API_URL || 'http://localhost:1337',
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
    },
  };
});
