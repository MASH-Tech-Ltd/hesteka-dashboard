import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite";
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/mash/sa/vai/protect': {
        target: 'http://localhost:5000/api/v1',
        changeOrigin: true,
        rewrite: (path) => {
          const prefix = '/mash/sa/vai/protect';
          if (path.startsWith(prefix + '/')) {
            const encoded = path.substring(prefix.length + 1);
            if (encoded.startsWith('musu?_')) {
              try {
                const base64Str = encoded.substring(6);
                const decoded = Buffer.from(decodeURIComponent(base64Str), 'base64').toString('utf-8');
                return decoded.startsWith('/') ? decoded : '/' + decoded;
              } catch(e) {
                return path.replace(prefix, '');
              }
            } else {
              // Pass through unencoded paths (like hot-reload requests or old cached requests)
              return '/' + encoded;
            }
          }
          return path.replace(prefix, '');
        },
      }
    }
  }
});