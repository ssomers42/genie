import { parseHTML } from "npm:linkedom@0.16.8";

const MAX_HTML_BYTES = 2_000_000;
const MAX_IMAGES = 48;
const EARLY_CAP = 64;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function cleanProductTitle(raw: string): string {
  if (!raw) return "";
  let s = raw.replace(/\s+/g, " ").trim();
  if (s.includes(" | ")) s = s.split(" | ")[0]?.trim() ?? "";
  else if (s.includes(" – ")) s = s.split(" – ")[0]?.trim() ?? "";
  if (s.length > 120) s = s.slice(0, 119) + "…";
  return s;
}

function pushUrl(
  raw: string | null | undefined,
  pageUrl: string,
  seen: Set<string>,
  out: string[],
): void {
  if (!raw || typeof raw !== "string") return;
  let s = raw.trim();
  if (!s || s.startsWith("data:") || s.startsWith("blob:")) return;
  if (s.startsWith("//")) s = "https:" + s;
  try {
    const absolute = new URL(s, pageUrl).href;
    if (!/^https?:\/\//i.test(absolute)) return;
    if (seen.has(absolute)) return;
    seen.add(absolute);
    out.push(absolute);
  } catch {
    /* ignore */
  }
}

function firstFromSrcset(srcset: string | null | undefined): string | null {
  if (!srcset || typeof srcset !== "string") return null;
  const part = srcset.split(",")[0]?.trim();
  if (!part) return null;
  const url = part.split(/\s+/)[0];
  return url || null;
}

function extractProductName(doc: Document): string {
  const og = doc
    .querySelector('meta[property="og:title"]')
    ?.getAttribute("content");
  const tw = doc
    .querySelector('meta[name="twitter:title"]')
    ?.getAttribute("content");
  const titleEl = doc.querySelector("title");
  const t = titleEl?.textContent;
  const raw = (og && og.trim()) || (tw && tw.trim()) || (t && t.trim()) || "";
  return cleanProductTitle(raw);
}

function collectImageUrls(
  doc: Document,
  html: string,
  pageUrl: string,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (
    const meta of doc.querySelectorAll(
      'meta[property="og:image"], meta[property="og:image:secure_url"], meta[name="twitter:image"], meta[name="twitter:image:src"]',
    )
  ) {
    pushUrl(meta.getAttribute("content"), pageUrl, seen, out);
    if (out.length >= EARLY_CAP) return out.slice(0, MAX_IMAGES);
  }

  for (const script of doc.querySelectorAll(
    'script[type="application/ld+json"]',
  )) {
    const text = script.textContent?.trim();
    if (!text) continue;
    try {
      const data = JSON.parse(text) as unknown;
      const stack = Array.isArray(data) ? data : [data];
      for (const node of stack) {
        if (!node || typeof node !== "object") continue;
        const img = (node as { image?: unknown }).image;
        if (typeof img === "string") pushUrl(img, pageUrl, seen, out);
        else if (Array.isArray(img)) {
          for (const x of img) {
            if (typeof x === "string") pushUrl(x, pageUrl, seen, out);
            else if (x && typeof x === "object" && "url" in x) {
              pushUrl(String((x as { url: string }).url), pageUrl, seen, out);
            } else if (img && typeof img === "object" && "url" in img) {
              pushUrl(String((img as { url: string }).url), pageUrl, seen, out);
            }
          }
        }
      }
    } catch {
      /* invalid JSON-LD */
    }
    if (out.length >= EARLY_CAP) return out.slice(0, MAX_IMAGES);
  }

  const flat = html.replace(/\\\//g, "/");
  const shopifyFile =
    /https?:\/\/[^"'\\\s<>]+?\/cdn\/shop\/files\/[^"'\\\s<>]+\.(?:jpg|jpeg|png|webp)(?:\?[^"'\\\s<>]*)?/gi;
  let m: RegExpExecArray | null;
  while ((m = shopifyFile.exec(flat)) !== null) {
    pushUrl(m[0], pageUrl, seen, out);
    if (out.length >= EARLY_CAP) break;
  }

  for (const el of doc.querySelectorAll("img, picture source")) {
    const candidates = [
      el.getAttribute("src"),
      el.getAttribute("data-src"),
      el.getAttribute("data-lazy-src"),
      firstFromSrcset(el.getAttribute("srcset")),
    ];
    for (const c of candidates) {
      pushUrl(c, pageUrl, seen, out);
      if (out.length >= EARLY_CAP) return out.slice(0, MAX_IMAGES);
    }
  }

  return out.slice(0, MAX_IMAGES);
}

async function fetchUpstream(
  href: string,
): Promise<{ ok: boolean; status: number; html: string }> {
  const commonHeaders = {
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Upgrade-Insecure-Requests": "1",
  };
  const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
  ];

  let upstream: Response | null = null;
  for (const ua of userAgents) {
    const r = await fetch(href, {
      headers: { ...commonHeaders, "User-Agent": ua },
      redirect: "follow",
    });
    upstream = r;
    if (r.ok) break;
    if (r.status !== 403 && r.status !== 401) break;
  }

  if (!upstream) {
    return { ok: false, status: 502, html: "" };
  }

  const buf = new Uint8Array(await upstream.arrayBuffer());
  const slice = buf.length > MAX_HTML_BYTES
    ? buf.slice(0, MAX_HTML_BYTES)
    : buf;
  const html = new TextDecoder("utf-8", { fatal: false }).decode(slice);

  return { ok: upstream.ok, status: upstream.status, html };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    if (req.method !== "POST") {
      return json({ ok: false, error: "Method not allowed", status: 405 });
    }

    const body = (await req.json()) as { url?: string };
    const target = body.url;
    if (!target || typeof target !== "string") {
      return json({ ok: false, error: "Missing url", status: 400 });
    }

    let parsed: URL;
    try {
      parsed = new URL(target);
    } catch {
      return json({ ok: false, error: "Invalid url", status: 400 });
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return json({ ok: false, error: "Invalid protocol", status: 400 });
    }

    const fetched = await fetchUpstream(parsed.href);
    if (!fetched.ok) {
      const blocked = fetched.status === 403 || fetched.status === 401;
      return json({
        ok: false,
        error: `Could not load this page (${fetched.status}).`,
        blocked,
        status: fetched.status,
      });
    }

    let html = fetched.html;
    const trimmed = html.trimStart();
    if (trimmed.startsWith("{")) {
      try {
        const data = JSON.parse(trimmed) as { contents?: string };
        if (typeof data.contents === "string" && data.contents.length) {
          html = data.contents;
        }
      } catch {
        /* use raw */
      }
    }

    if (html.length < 400 || !/<html[\s>]/i.test(html)) {
      return json({
        ok: false,
        error: "Could not load this page.",
        status: fetched.status,
      });
    }

    const { document } = parseHTML(html);
    const title = extractProductName(document) || null;
    const images = collectImageUrls(document, html, parsed.href);

    return json({
      ok: true,
      title,
      images,
      meta: {},
    });
  } catch (e) {
    console.error(e);
    return json({
      ok: false,
      error: "Upstream fetch failed",
      status: 502,
    });
  }
});
