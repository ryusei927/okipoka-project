import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// Static build for Vercel (no server runtime needed)
export default defineConfig({
  output: 'static',
  integrations: [react()],
});