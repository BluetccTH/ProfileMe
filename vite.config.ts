import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// The Live2D component previously replaced pixi-live2d-display's native
// resource loader and accidentally treated image resources as text. That
// makes valid PNG textures fail with "Texture loading error" in production.
// Keep the source component unchanged, but remove only that broken middleware
// during the Vite transform so JSON/MOC3/PNG loading uses the library's native
// relative-URL handling.
const fixLive2DLoader = () => ({
  name: 'fix-live2d-native-texture-loader',
  enforce: 'pre' as const,
  transform(code: string, id: string) {
    if (!id.replace(/\\/g, '/').endsWith('/src/components/Live2DAvatar.tsx')) {
      return null;
    }

    const middlewarePattern = /\\n\\s*\\/\\/ Modern fetch-based loader middleware[\\s\\S]*?\\n\\s*\\];/;
    if (!middlewarePattern.test(code)) {
      return null;
    }

    return {
      code: code.replace(
        middlewarePattern,
        '\\n        // Use pixi-live2d-display native loading so PNG textures are decoded as images.'
      ),
      map: null,
    };
  },
});

export default defineConfig(() => {
  return {
    base: './',
    plugins: [fixLive2DLoader(), react(), tailwindcss()],
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
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
