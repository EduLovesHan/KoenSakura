import { defineConfig } from 'vite';
import viteCompression from 'vite-plugin-compression';

export default defineConfig({
    plugins: [
        // Genera archivos .br (Brotli) para Vercel
        viteCompression({
            algorithm: 'brotliCompress',
            ext: '.br',
            threshold: 10240, // Comprime todo archivo mayor a 10KB
        }),
        // Genera archivos .gz (Gzip) como respaldo
        viteCompression({
            algorithm: 'gzip',
            ext: '.gz',
            threshold: 10240,
        })
    ],
    build: {
        target: 'esnext',
        minify: 'esbuild',
        sourcemap: false,
        rollupOptions: {
            output: {
                // Separa Three.js y GSAP en chunks independientes para facilitar el caché
                manualChunks(id) {
                    if (id.includes('node_modules')) {
                        if (id.includes('three')) {
                            return 'vendor-three';
                        }
                        if (id.includes('gsap')) {
                            return 'vendor-gsap';
                        }
                        return 'vendor-libs';
                    }
                }
            }
        }
    }
});
