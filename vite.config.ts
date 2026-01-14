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
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(apiKey),
        'process.env.GEMINI_API_KEY': JSON.stringify(geminiKey),
        'process.env.ZHIPUAI_API_KEY': JSON.stringify(zhipuaiKey),
        'process.env.ZHIPUAI_API_BASE': JSON.stringify(env.ZHIPUAI_API_BASE || env.VITE_ZHIPUAI_API_BASE || 'https://open.bigmodel.cn/api/paas/v4'),
        'process.env.ZHIPUAI_MODEL': JSON.stringify(env.ZHIPUAI_MODEL || env.VITE_ZHIPUAI_MODEL || 'glm-4-flash'),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
