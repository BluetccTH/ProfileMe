import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig, Plugin} from 'vite';

function live2dAutoRestorePlugin(): Plugin {
  return {
    name: 'live2d-auto-restore',
    buildStart() {
      try {
        const mocPath = path.resolve(__dirname, 'scripts/moc3_base64.txt');
        const texPath = path.resolve(__dirname, 'scripts/texture_base64.txt');
        if (fs.existsSync(mocPath) && fs.existsSync(texPath)) {
          const mocBin = Buffer.from(fs.readFileSync(mocPath, 'utf8').trim(), 'base64');
          const texBin = Buffer.from(fs.readFileSync(texPath, 'utf8').trim(), 'base64');
          const publicMoc = path.resolve(__dirname, 'public/live2d/MassageSeacubus_rei.moc3');
          const publicTex = path.resolve(__dirname, 'public/live2d/MassageSeacubus_rei.4096/texture_00.png');
          fs.mkdirSync(path.dirname(publicMoc), { recursive: true });
          fs.mkdirSync(path.dirname(publicTex), { recursive: true });
          fs.writeFileSync(publicMoc, mocBin);
          fs.writeFileSync(publicTex, texBin);
          console.log('[Vite Live2D Plugin] Restored pure binary Live2D assets to public/ before bundling.');
        }
      } catch (e) {
        console.warn('[Vite Live2D Plugin] Notice during buildStart restore:', e);
      }
    },
    closeBundle() {
      try {
        const mocPath = path.resolve(__dirname, 'scripts/moc3_base64.txt');
        const texPath = path.resolve(__dirname, 'scripts/texture_base64.txt');
        if (fs.existsSync(mocPath) && fs.existsSync(texPath)) {
          const mocBin = Buffer.from(fs.readFileSync(mocPath, 'utf8').trim(), 'base64');
          const texBin = Buffer.from(fs.readFileSync(texPath, 'utf8').trim(), 'base64');
          const distMoc = path.resolve(__dirname, 'dist/live2d/MassageSeacubus_rei.moc3');
          const distTex = path.resolve(__dirname, 'dist/live2d/MassageSeacubus_rei.4096/texture_00.png');
          fs.mkdirSync(path.dirname(distMoc), { recursive: true });
          fs.mkdirSync(path.dirname(distTex), { recursive: true });
          fs.writeFileSync(distMoc, mocBin);
          fs.writeFileSync(distTex, texBin);
          console.log('[Vite Live2D Plugin] Ensured pure binary Live2D assets in dist/ for GitHub Pages deployment.');
        }
      } catch (e) {
        console.warn('[Vite Live2D Plugin] Notice during closeBundle restore:', e);
      }
    },
  };
}

export default defineConfig(() => {
  return {
    base: './',
    plugins: [react(), tailwindcss(), live2dAutoRestorePlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      cors: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
