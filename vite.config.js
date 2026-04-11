import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    {
      name: 'local-proxy',
      configureServer(server) {
        server.middlewares.use('/api/proxy', async (req, res) => {
          const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''
          const target = new URLSearchParams(qs).get('url')

          if (!target) {
            res.writeHead(400)
            res.end('Missing url parameter')
            return
          }

          let parsed
          try {
            parsed = new URL(target)
          } catch {
            res.writeHead(400)
            res.end('Invalid url')
            return
          }

          if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            res.writeHead(400)
            res.end('Invalid protocol')
            return
          }

          try {
            const upstream = await fetch(parsed.href, {
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36',
                Accept:
                  'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
              },
              redirect: 'follow',
            })
            const body = await upstream.text()
            res.writeHead(upstream.status, {
              'Content-Type': 'text/html; charset=utf-8',
              'Access-Control-Allow-Origin': '*',
              'Cache-Control': 'no-store',
            })
            res.end(body)
          } catch (e) {
            res.writeHead(502)
            res.end('Upstream fetch failed')
          }
        })
      },
    },
  ],
})
