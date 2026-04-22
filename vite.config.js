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

          const commonHeaders = {
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Upgrade-Insecure-Requests': '1',
          }
          const userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
          ]

          try {
            let upstream = null
            for (const ua of userAgents) {
              const r = await fetch(parsed.href, {
                headers: { ...commonHeaders, 'User-Agent': ua },
                redirect: 'follow',
              })
              upstream = r
              if (r.ok) break
              if (r.status !== 403 && r.status !== 401) break
            }
            if (!upstream) {
              res.writeHead(502)
              res.end('Upstream fetch failed')
              return
            }
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
