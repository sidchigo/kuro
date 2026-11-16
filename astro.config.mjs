import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import node from '@astrojs/node';
import vercel from '@astrojs/vercel';

const isVercel = Boolean(process.env.VERCEL || process.env.DEPLOY_TARGET === 'vercel');

// https://astro.build/config
export default defineConfig({
  output: 'static',
  adapter: isVercel
    ? vercel({
        webAnalytics: { enabled: false },
        imageService: true,
      })
    : node({
        mode: 'standalone',
      }),
  integrations: [
    react(),
    tailwind({
      applyBaseStyles: false,
    }),
  ],
  vite: {
    worker: {
      format: 'es',
    },
  },
});
