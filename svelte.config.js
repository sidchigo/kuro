import adapterNode from '@sveltejs/adapter-node';
import adapterVercel from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const isVercel = Boolean(process.env.VERCEL || process.env.DEPLOY_TARGET === 'vercel');

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: isVercel ? adapterVercel() : adapterNode(),
    alias: {
      '@': './src',
    },
  },
};

export default config;
