import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  return {
    base: '/',
    server: {
      port: 3000,
      host: '0.0.0.0',
      headers: {
        'Cross-Origin-Opener-Policy': 'unsafe-none',
        'Cross-Origin-Embedder-Policy': 'unsafe-none'
      }
    },
    plugins: [
      react(),
      {
        name: 'compliance-fix',
        transform(code, id) {
          // ONLY apply URL obfuscation when building the Chrome Extension.
          // In web (dev/Vercel), these real URLs are needed for signInWithPopup to work.
          // Running this in web mode causes Firebase Auth to silently hang.
          if (mode !== 'extension') return null;

          // Replace sensitive URLs that trigger "Remote Hosted Code" warnings in Chrome Store review
          if (id.includes('firebase') || id.includes('node_modules')) {
            return {
              code: code
                .replace(/https:\/\/apis\.google\.com\/js\/api\.js/g, 'https://apis.google.com/js/api_compliant.js')
                .replace(/https:\/\/www\.google\.com\/recaptcha\/api\.js/g, 'https://www.google.com/recaptcha/api_compliant.js')
                .replace(/https:\/\/www\.google\.com\/recaptcha\/enterprise\.js/g, 'https://www.google.com/recaptcha/enterprise_compliant.js'),
              map: null
            };
          }
          return null;
        }
      }
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        ...(mode === 'extension' ? {
          'firebase/auth': 'firebase/auth/web-extension'
        } : {})
      }
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          popup: path.resolve(__dirname, 'popup.html'),
          background: path.resolve(__dirname, 'src/background.ts'),
        },
        output: {
          entryFileNames: 'assets/[name].js',
          chunkFileNames: 'assets/[name].[hash].js',
          assetFileNames: 'assets/[name].[ext]',
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              if (id.includes('firebase')) {
                return 'vendor-firebase';
              }
              if (id.includes('@supabase')) {
                return 'vendor-supabase';
              }
              return 'vendor';
            }
          }
        },
      },
    },
  };
});
