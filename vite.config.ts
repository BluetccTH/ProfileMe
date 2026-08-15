import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// Harden Live2D loading for GitHub Pages.
// The model files remain byte-for-byte unchanged in public/live2d.
// At runtime we fetch them ourselves, validate the MOC3 header, stage the
// binary resources as Blob URLs, then let pixi-live2d-display consume those
// Blob URLs. This avoids GitHub Pages path/MIME/cache edge cases that were
// causing Texture loading error and csmReviveMocInPlace: size is invalid.
const hardenLive2DLoader = () => ({
  name: 'harden-live2d-loader',
  enforce: 'pre' as const,
  transform(code: string, id: string) {
    const normalizedId = id.replace(/\\/g, '/');
    if (!normalizedId.endsWith('/src/components/Live2DAvatar.tsx')) return null;

    // Remove the old custom loader middleware. Native pixi-live2d-display
    // decoding is used after resources have been staged as Blob URLs.
    const middlewarePattern = /\n\s*\/\/ Modern fetch-based loader middleware[\s\S]*?\n\s*\];/;
    let next = code.replace(
      middlewarePattern,
      '\n        // Hardened Blob-backed Live2D loader is injected by vite.config.ts.'
    );

    const loadPattern = /const model = await Live2DModel\.from\(modelUrl, \{\s*autoInteract: false,?\s*\}\);/;
    if (!loadPattern.test(next)) return { code: next, map: null };

    const injected = `
        const loadLive2DFromVerifiedBlobs = async () => {
          const response = await fetch(modelUrl, { cache: 'no-store' });
          if (!response.ok) {
            throw new Error(\`Live2D model JSON HTTP \\${response.status}\`);
          }

          const settings = await response.json();
          settings.url = modelUrl;
          const refs = settings.FileReferences || {};
          const baseUrl = new URL('.', modelUrl).href;
          const blobUrls: string[] = [];

          const stageBinary = async (relativePath: string, label: string) => {
            if (!relativePath) throw new Error(\`Missing Live2D \\${label} reference\`);

            const source = new URL(relativePath, baseUrl).href;
            const assetResponse = await fetch(source, { cache: 'no-store' });
            if (!assetResponse.ok) {
              throw new Error(\`Live2D \\${label} HTTP \\${assetResponse.status}: \\${source}\`);
            }

            const bytes = await assetResponse.arrayBuffer();

            if (label === 'MOC3') {
              if (bytes.byteLength < 64) {
                throw new Error(\`Invalid MOC3 size: \\${bytes.byteLength} bytes\`);
              }
              const magic = new TextDecoder().decode(bytes.slice(0, 4));
              if (magic !== 'MOC3') {
                throw new Error(\`Invalid MOC3 header: \\${JSON.stringify(magic)}\`);
              }
            }

            const contentType = assetResponse.headers.get('content-type') || 'application/octet-stream';
            const blobUrl = URL.createObjectURL(new Blob([bytes], { type: contentType }));
            blobUrls.push(blobUrl);
            return blobUrl;
          };

          refs.Moc = await stageBinary(refs.Moc, 'MOC3');
          if (refs.Physics) refs.Physics = await stageBinary(refs.Physics, 'physics');
          if (refs.Pose) refs.Pose = await stageBinary(refs.Pose, 'pose');
          if (refs.DisplayInfo) refs.DisplayInfo = await stageBinary(refs.DisplayInfo, 'displayInfo');

          if (Array.isArray(refs.Textures)) {
            refs.Textures = await Promise.all(
              refs.Textures.map((file: string) => stageBinary(file, 'texture'))
            );
          }

          if (Array.isArray(refs.Expressions)) {
            refs.Expressions = await Promise.all(
              refs.Expressions.map(async (entry: any) => ({
                ...entry,
                File: await stageBinary(entry.File, 'expression'),
              }))
            );
          }

          if (refs.Motions && typeof refs.Motions === 'object') {
            for (const [group, motions] of Object.entries(refs.Motions)) {
              if (Array.isArray(motions)) {
                refs.Motions[group] = await Promise.all(
                  (motions as any[]).map(async (entry) => ({
                    ...entry,
                    File: await stageBinary(entry.File, 'motion'),
                  }))
                );
              }
            }
          }

          // Keep Blob URLs alive for the lifetime of the page/model.
          (window as any).__live2dBlobUrls = blobUrls;

          return Live2DModel.from(settings, {
            autoInteract: false,
            checkMocConsistency: false,
          });
        };

        const model = await loadLive2DFromVerifiedBlobs();`;

    next = next.replace(loadPattern, injected);
    return { code: next, map: null };
  },
});

export default defineConfig(() => ({
  base: './',
  plugins: [hardenLive2DLoader(), react(), tailwindcss()],
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
