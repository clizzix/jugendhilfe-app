import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Fügt einen Alias "@shared" hinzu, der auf den Ordner jugendhilfe-app/shared/ zeigt
      "@shared": path.resolve(__dirname, '..', 'shared'), 
    },
  },
});