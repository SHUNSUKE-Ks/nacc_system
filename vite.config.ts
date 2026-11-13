import { defineConfig, loadEnv, type Plugin } from 'vite'
import solid from 'vite-plugin-solid'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { handleFax } from './api/_fax/core.ts'

/** 開発中だけ /api/fax/* を Vite で受ける（本番は Vercel の api/fax/[action].ts） */
function faxApiDev(): Plugin {
  return {
    name: 'nacc-fax-api-dev',
    configureServer(server) {
      const env = { ...loadEnv(server.config.mode, process.cwd(), ''), ...process.env }
      server.middlewares.use('/api/fax/', (req, res) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        const route = url.pathname.replace(/^\/+/, '')
        let raw = ''
        req.on('data', (c) => { raw += c })
        req.on('end', async () => {
          let body: unknown
          try { body = raw ? JSON.parse(raw) : undefined } catch { body = undefined }
          const r = await handleFax(route, req.method ?? 'GET', body, url.searchParams, env)
          res.statusCode = r.status
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify(r.json))
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [
    faxApiDev(),
    solid(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'icons/nacc-note.svg'],
      manifest: {
        name: 'NACC Note',
        short_name: 'NACC Note',
        description: 'NACC商品・成分ノート',
        theme_color: '#b38247',
        background_color: '#f7f6f3',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        skipWaiting: true,
        clientsClaim: true,
      },
    }),
  ],
})
