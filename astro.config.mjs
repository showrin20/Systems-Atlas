import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  site: 'https://systems-atlas.example.com', // change to your domain for correct sitemap/OG URLs
  markdown: {
    shikiConfig: {
      theme: 'one-dark-pro',
      wrap: false,
    },
  },
});
