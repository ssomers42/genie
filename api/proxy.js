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

  const upstream = await fetch(parsed.href, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    redirect: 'follow',
  })

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
