import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { defineConfig, Plugin } from 'vite';

// Plugin untuk otomatis menyalin file .env ke folder dist saat build
function copyEnvPlugin(): Plugin {
  return {
    name: 'copy-env-to-dist',
    closeBundle() {
      const rootEnv = path.resolve(import.meta.dirname, '.env');
      const distDir = path.resolve(import.meta.dirname, 'dist');
      const distEnv = path.resolve(distDir, '.env');

      if (fs.existsSync(rootEnv)) {
        if (!fs.existsSync(distDir)) {
          fs.mkdirSync(distDir, { recursive: true });
        }
        fs.copyFileSync(rootEnv, distEnv);
        console.log('✓ File .env berhasil disalin ke folder dist/.env');
      }
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), copyEnvPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
