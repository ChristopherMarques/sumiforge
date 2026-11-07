import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  publicDir: false,
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname || '.'),
    },
  },
  build: {
    lib: {
      entry: path.resolve(import.meta.dirname || '.', 'src/lib/sumi-forge/index.ts'),
      name: 'SumiForgeReact',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'js' : 'cjs'}`,
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
      ],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
    outDir: 'dist-lib',
    emptyOutDir: false,
    sourcemap: true,
  },
});
