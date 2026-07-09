import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  // Add these for better development
  server: {
    port: 8080,
    host: true,        // Allow access from 192.168.1.3
    strictPort: true,
  },
  // Fix hydration and path issues
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});