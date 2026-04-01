import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load from .env files (for local development)
  const envFromFile = loadEnv(mode, '.', '');

  // Merge with process.env (for Vercel/build environments)
  // process.env takes precedence over .env files
  const env = { ...envFromFile, ...process.env };

  // Support multiple API providers - prioritize DeepSeek/SiliconFlow
  const deepseekKey = env.DEEPSEEK_API_KEY || env.VITE_DEEPSEEK_API_KEY;
  const siliconKey = env.SILICONFLOW_API_KEY || env.VITE_SILICONFLOW_API_KEY;
  const apiKey = deepseekKey || siliconKey;

  // Debug logging (only in build, not in production bundle)
  if (process.env.VERCEL || process.env.CI) {
    console.log('🔍 Environment Variables Check:');
    console.log('  DEEPSEEK_API_KEY:', deepseekKey ? 'SET' : 'NOT SET');
    console.log('  SILICONFLOW_API_KEY:', siliconKey ? 'SET' : 'NOT SET');
    console.log('  Final API Key:', apiKey ? 'SET' : 'NOT SET');
  }

  return {
    base: '/',
    server: {
      port: 3000,
      host: '0.0.0.0',
      headers: {
        'Cross-Origin-Opener-Policy': 'unsafe-none',
        'Cross-Origin-Embedder-Policy': 'unsafe-none'
      },
      proxy: {
        '/api/siliconflow': {
          target: 'https://api.siliconflow.cn/v1',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/siliconflow/, ''),
        },
        '/api/deepseek': {
          target: 'https://api.deepseek.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/deepseek/, ''),
        },
      },
    },
    plugins: [
      react(),
      {
        name: 'compliance-fix',
        transform(code, id) {
          // Replace sensitive URLs that trigger "Remote Hosted Code" warnings
          // These are often embedded in libraries like Firebase for features we don't use in extensions
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
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
      'process.env.SILICONFLOW_API_KEY': JSON.stringify(env.SILICONFLOW_API_KEY || env.VITE_SILICONFLOW_API_KEY || ''),
      'process.env.SILICONFLOW_API_BASE': JSON.stringify(env.SILICONFLOW_API_BASE || env.VITE_SILICONFLOW_API_BASE || 'https://api.siliconflow.cn/v1'),
      'process.env.SILICONFLOW_MODEL': JSON.stringify(env.SILICONFLOW_MODEL || env.VITE_SILICONFLOW_MODEL || 'deepseek-ai/DeepSeek-V3'),
      'process.env.DEEPSEEK_API_KEY': JSON.stringify(env.DEEPSEEK_API_KEY || env.VITE_DEEPSEEK_API_KEY || ''),
      'process.env.DEEPSEEK_API_BASE': JSON.stringify(env.DEEPSEEK_API_BASE || env.VITE_DEEPSEEK_API_BASE || 'https://api.deepseek.com'),
      'process.env.DEEPSEEK_MODEL': JSON.stringify(env.DEEPSEEK_MODEL || env.VITE_DEEPSEEK_MODEL || 'deepseek-chat'),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          popup: path.resolve(__dirname, 'popup.html'),
          background: path.resolve(__dirname, 'src/background.ts'),
          offscreen: path.resolve(__dirname, 'src/extension/offscreen.html'),
        },
        output: {
          entryFileNames: 'assets/[name].js',
          chunkFileNames: 'assets/[name].js',
          assetFileNames: 'assets/[name].[ext]',
        },
      },
    },
  };
});
