import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import { studioConfig } from './src/lib/config/studioConfig.ts'

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Preenche o index.html com os dados white-label de studioConfig.ts. */
function studioHtml(): Plugin {
  const tokens: Record<string, string> = {
    STUDIO_NAME: studioConfig.brand.name,
    STUDIO_TAGLINE: studioConfig.brand.tagline,
    STUDIO_SEO_TITLE: studioConfig.seo.title,
    STUDIO_SEO_DESCRIPTION: studioConfig.seo.description,
    STUDIO_THEME_COLOR: studioConfig.seo.themeColor,
    STUDIO_LOCALE: studioConfig.seo.locale,
    // og:image precisa ser absoluta para gerar prévia no WhatsApp/redes (defina seo.siteUrl).
    STUDIO_OG_IMAGE: `${studioConfig.seo.siteUrl || '/'}og-image.jpg`,
  }
  return {
    name: 'monolith-studio-html',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => html.replace(/%(STUDIO_[A-Z_]+)%/g, (match, key: string) => escapeHtml(tokens[key] ?? match)),
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  // Subpasta de publicação (GitHub Pages: '/<repo>/'). Local e domínio próprio: '/'.
  base: process.env.BASE_PATH ?? '/',
  plugins: [studioHtml(), svelte()],
  build: {
    rolldownOptions: {
      // Aviso informativo de tempo de plugins (intermitente em builds "frios"); não é erro de código.
      checks: { bundlerTimings: false },
    },
  },
})
