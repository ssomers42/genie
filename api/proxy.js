export const config = { runtime: 'edge' }

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])

export default async function handler(req) {
  const { searchParams } = new URL(req.url)
  const target = searchParams.get('url')

  if (!target) {
    return new Response('Missing url parameter', { status: 400 })
  }

  let parsed
  try {
    parsed = new URL(target)
  } catch {
    return new Response('Invalid url', { status: 400 })
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    return new Response('Invalid protocol', { status: 400 })
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
    return new Response('Upstream fetch failed', { status: 502 })
  }

  const body = await upstream.text()

  return new Response(body, {
    status: upstream.status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
    },
  })
}
