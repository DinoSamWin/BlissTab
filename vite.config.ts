import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load from .env files (for local development)
  const envFromFile = loadEnv(mode, '.', '');

  // Merge with process.env (for Vercel/build environments)
  // process.env takes precedence over .env files
  const env = { ...envFromFile, ...process.env };

  // Support multiple API providers - prefer ZhipuAI if available
  const zhipuaiKey = env.ZHIPUAI_API_KEY || env.VITE_ZHIPUAI_API_KEY;
  const geminiKey = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY;
  const apiKey = zhipuaiKey || geminiKey; // Prefer ZhipuAI if both exist

  // Debug logging (only in build, not in production bundle)
  if (process.env.VERCEL || process.env.CI) {
    console.log('🔍 Environment Variables Check:');
    console.log('  ZHIPUAI_API_KEY:', zhipuaiKey ? `${zhipuaiKey.substring(0, 10)}...` : 'NOT SET');
    console.log('  VITE_ZHIPUAI_API_KEY:', env.VITE_ZHIPUAI_API_KEY ? 'SET' : 'NOT SET');
    console.log('  GEMINI_API_KEY:', geminiKey ? 'SET' : 'NOT SET');
    console.log('  Final API Key:', apiKey ? 'SET' : 'NOT SET');
  }

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
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
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(''),
      'process.env.GEMINI_API_KEY': JSON.stringify(''),
      'process.env.ZHIPUAI_API_KEY': JSON.stringify(''),
      'process.env.ZHIPUAI_API_BASE': JSON.stringify(''),
      'process.env.ZHIPUAI_MODEL': JSON.stringify(''),
      'process.env.SILICONFLOW_API_BASE': JSON.stringify(''),
      'process.env.SILICONFLOW_MODEL': JSON.stringify(''),
      // New DeepSeek Config
      'process.env.DEEPSEEK_API_KEY': JSON.stringify(env.DEEPSEEK_API_KEY || env.VITE_DEEPSEEK_API_KEY || ''),
      'process.env.DEEPSEEK_API_BASE': JSON.stringify(env.DEEPSEEK_API_BASE || env.VITE_DEEPSEEK_API_BASE || 'https://api.deepseek.com'),
      'process.env.DEEPSEEK_MODEL': JSON.stringify(env.DEEPSEEK_MODEL || env.VITE_DEEPSEEK_MODEL || 'deepseek-chat'),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    }
  };
});
