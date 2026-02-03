
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs';

// simple plugin to copy manifest
const copyManifest = () => {
    return {
        name: 'copy-manifest',
        closeBundle: async () => {
            const src = resolve(__dirname, 'src/extension/manifest.json');
            const dest = resolve(__dirname, 'dist_extension/manifest.json');
            if (fs.existsSync(src)) {
                fs.copyFileSync(src, dest);
                console.log('Manifest copied to dist_extension');
            }
        }
    }
}

export default defineConfig({
    plugins: [
        react(),
        copyManifest()
    ],
    resolve: {
        alias: {
            '@': resolve(__dirname, './src'),
        }
    },
    build: {
        outDir: 'dist_extension',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                newtab: resolve(__dirname, 'index.html'),
                popup: resolve(__dirname, 'src/extension/popup.html'),
                background: resolve(__dirname, 'src/extension/background.ts'),
            },
            output: {
                entryFileNames: '[name].js',
                chunkFileNames: 'assets/[name]-[hash].js',
                assetFileNames: 'assets/[name]-[hash].[ext]',
            }
        },
    },
});
