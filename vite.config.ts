import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// Remove the custom Live2D fetch middleware at build time.
// pixi-live2d-display's native loader must receive JSON/MOC3/PNG resources
// in their original binary form; the old middleware caused production
// texture decoding failures and "csmReviveMocInPlace: size is invalid".
const useNativeLive2DLoader = () => ({
  name: 'use-native-live2d-loader',
  enforce: 'pre' as const,
  transform(code: string, id: string) {
    const normalizedId = id.replace(/\\/g, '/');
    if (!normalizedId.endsWith('/src/components/Live2DAvatar.tsx')) {
      return null;
    }

    const middlewarePattern = /\n\s*\/\/ Modern fetch-based loader middleware[\s\S]*?\n\s*\];/;
    if (!middlewarePattern.test(code)) {
      return null;
    }

    return {
      code: code.replace(
        middlewarePattern,
        '\n        // Native pixi-live2d-display loader: preserve JSON/MOC3/PNG decoding.'
      ),
      map: null,
    };
  },
});

export default defineConfig(() => ({
  base: './',
  plugins: [useNativeLive2DLoader(), react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    cors: true,
    hmr: process.env.DISABLE_HMR !== 'true',
    watch: process.env.DISABLE_HMR === 'true' ? null : {},
  },
}));
