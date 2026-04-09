import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// HTTPS certs generated with: mkcert localhost 127.0.0.1 <YOUR_IP> ::1
const httpsConfig = {
  cert: fs.readFileSync(path.resolve(__dirname, "localhost+3.pem")),
  key: fs.readFileSync(path.resolve(__dirname, "localhost+3-key.pem")),
};

export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",  // Allow access from local network (iPhone, etc.)
    port: 8080,
    https: httpsConfig,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
        secure: false,  // Allow proxy to HTTP backend when frontend is HTTPS
      },
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: 'FitFuel Hub',
        short_name: 'FitFuel',
        theme_color: '#06b6d4',
        background_color: '#0f172a',
        display: 'standalone',
        icons: [
          { src: '/favicon.png', sizes: '192x192', type: 'image/png' },
          { src: '/favicon.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
