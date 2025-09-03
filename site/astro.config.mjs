// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // When hosting on a custom domain, base should be '/'
  // If you host as a project site (username.github.io/repo), set base to '/repo/'
  base: '/',

  outDir: '../docs',
  site: 'https://ed-thomas.dev',
  integrations: [tailwind(), sitemap()],
  markdown: {
    shikiConfig: {
      theme: 'github-light',
      wrap: true
    }
  }
});