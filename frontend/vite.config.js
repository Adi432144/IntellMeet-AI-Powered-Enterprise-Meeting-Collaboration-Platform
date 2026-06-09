/**
 * @file vite.config.js
 * @description Standardized Vite 8 architecture compiler configuration engine.
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Enforces clean react element evaluation processing passes
  plugins: [react()],
  server: {
    port: 3000, 
    proxy: {
      // Directs dynamic server requests into our Node pipeline smoothly
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      }
    }
  }
});