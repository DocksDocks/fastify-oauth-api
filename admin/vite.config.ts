import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [tailwindcss(), react()],
    base: '/admin/',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3000,
      allowedHosts: [
        '.ngrok-free.app',  // Allow all ngrok free tier hosts
        '.ngrok.io',        // Allow ngrok paid tier custom domains
        '.ngrok.app',       // Allow ngrok Hobbyist tier custom domains (e.g., growup.ngrok.app)
      ],
      proxy: {
        '/api': {
          target: 'http://localhost:1337',
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
    },
    // Expose ADMIN_PANEL_API_KEY as VITE_ADMIN_PANEL_API_KEY
    define: {
      'import.meta.env.VITE_ADMIN_PANEL_API_KEY': JSON.stringify(env.ADMIN_PANEL_API_KEY),
    },
  };
});
