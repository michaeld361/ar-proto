import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        host: '0.0.0.0',
    },
    build: {
        rollupOptions: {
            input: {
                main: 'index.html',
                ar: 'ar.html',
            },
        },
    },
});
