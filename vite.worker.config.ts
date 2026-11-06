import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
    resolve: {
        alias: {
            '#lib': fileURLToPath(new URL('./src/lib', import.meta.url))
        }
    },
    build: {
        ssr: 'worker/index.ts',
        target: 'node24',
        outDir: 'dist/worker',
        emptyOutDir: true,
        copyPublicDir: false,
        sourcemap: true,
        rolldownOptions: {
            output: {
                entryFileNames: 'index.js'
            }
        }
    }
});
