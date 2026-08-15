import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

const live2dNativeUrlLoader = () => ({
  name: 'live2d-native-url-loader',
  enforce: 'pre' as const,
  transform(code: string, id: string) {
    if (!id.endsWith('/src/components/Live2DAvatar.tsx')) return null;

    const settingsCall = 'const modelSettings = await validateLive2DAssets(modelUrl);';
    const modelCall = 'Live2DModel.from(modelSettings, { autoInteract: false })';

    if (!code.includes(settingsCall) || !code.includes(modelCall)) return null;

    const transformed = code
      .replace(settingsCall, 'await validateLive2DAssets(modelUrl);')
      .replace(modelCall, 'Live2DModel.from(modelUrl, { autoInteract: false })');

    return { code: transformed, map: null };
  },
});

export default defineConfig(() => ({
  base: './',
  plugins: [live2dNativeUrlLoader(), react(), tailwindcss()],
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
