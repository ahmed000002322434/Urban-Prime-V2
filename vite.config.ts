import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const getNodeModulePackageName = (id: string) => {
      const nodeModulesToken = `${path.sep}node_modules${path.sep}`;
      const normalizedId = id.split('/').join(path.sep);
      const packagePath = normalizedId.split(nodeModulesToken)[1];
      if (!packagePath) return null;
      const segments = packagePath.split(path.sep);
      if (!segments.length) return null;
      if (segments[0].startsWith('@') && segments.length > 1) {
        return `${segments[0]}/${segments[1]}`;
      }
      return segments[0];
    };
    const deferredHtmlPreloads = [
      'vendor-ai',
      'vendor-charts',
      'vendor-confetti',
      'vendor-firebase-analytics',
      'vendor-firebase-firestore',
      'vendor-firebase-messaging',
      'vendor-firebase-storage',
      'vendor-lottie',
      'vendor-supabase'
    ];

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      build: {
        reportCompressedSize: false,
        modulePreload: {
          resolveDependencies: (_filename, deps, context) => {
            if (context.hostType !== 'html') return deps;
            return deps.filter(
              (dependency) => !deferredHtmlPreloads.some((chunkName) => dependency.includes(chunkName))
            );
          }
        },
        rollupOptions: {
          output: {
            manualChunks(id) {
              if (id.includes('node_modules')) {
                const packageName = getNodeModulePackageName(id);
                if (id.includes('react-router')) return 'vendor-router';
                if (id.includes('react-dom') || id.includes('react/jsx-runtime') || id.includes('/react/')) return 'vendor-react';
                if (id.includes('framer-motion')) return 'vendor-motion';
                if (
                  packageName === '@dotlottie/player-component' ||
                  packageName === 'lottie-web' ||
                  packageName === 'lit' ||
                  packageName === 'lit-html' ||
                  packageName === 'lit-element' ||
                  packageName?.startsWith('@lit/')
                ) {
                  return 'vendor-lottie';
                }
                if (packageName?.startsWith('@supabase/')) return 'vendor-supabase';
                if (id.includes('firebase')) {
                  if (id.includes('firebase/auth')) return 'vendor-firebase-auth';
                  if (id.includes('firebase/firestore')) return 'vendor-firebase-firestore';
                  if (id.includes('firebase/storage')) return 'vendor-firebase-storage';
                  if (id.includes('firebase/functions')) return 'vendor-firebase-functions';
                  if (id.includes('firebase/messaging')) return 'vendor-firebase-messaging';
                  if (id.includes('firebase/database')) return 'vendor-firebase-database';
                  if (id.includes('firebase/analytics')) return 'vendor-firebase-analytics';
                  if (id.includes('firebase/remote-config')) return 'vendor-firebase-remote-config';
                  if (id.includes('firebase/app')) return 'vendor-firebase-app';
                  return 'vendor-firebase';
                }
                if (id.includes('recharts') || id.includes('d3')) return 'vendor-charts';
                if (id.includes('@react-three') || id.includes('three') || id.includes('troika-three')) {
                  if (id.includes('three/examples') || id.includes('three/addons') || id.includes('three-stdlib') || id.includes('@react-three/drei') || id.includes('troika-three-text')) {
                    return 'vendor-three-extras';
                  }
                  if (id.includes('@react-three/fiber')) return 'vendor-three-fiber';
                  return 'vendor-three-core';
                }
                if (id.includes('@google/genai')) return 'vendor-ai';
                if (id.includes('canvas-confetti')) return 'vendor-confetti';
                return 'vendor';
              }

              if (
                id.includes(`${path.sep}components${path.sep}spotlight${path.sep}`) ||
                id.includes(`${path.sep}pages${path.sep}public${path.sep}PrimeSpotlightPage.tsx`) ||
                id.includes(`${path.sep}pages${path.sep}public${path.sep}SpotlightProfilePage.tsx`) ||
                id.includes(`${path.sep}pages${path.sep}protected${path.sep}CreateSpotlightPage.tsx`)
              ) {
                return 'spotlight';
              }

              if (
                id.includes(`${path.sep}pages${path.sep}protected${path.sep}PixeStudio.tsx`) ||
                id.includes(`${path.sep}pages${path.sep}protected${path.sep}CreateLiveStreamPage.tsx`) ||
                id.includes(`${path.sep}pages${path.sep}protected${path.sep}CreatePostPage.tsx`)
              ) {
                return 'creator-tools';
              }

              return undefined;
            }
          }
        }
      },
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
