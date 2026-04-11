import { createClient } from '@supabase/supabase-js'
import './style.css'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

const PROXIES = [
  (target) => '/api/proxy?url=' + encodeURIComponent(target),
]

const state = {
  view: 'loading',
  wishlistLayout: 'grid',
  url: '',
  itemName: '',
  itemNameManuallyEdited: false,
  images: [],
  selectedIndex: null,
  loading: false,
  error: '',
  selectedGroupId: null,
  newGroupName: '',
}

// In-memory store — kept in sync with Supabase
let store = { groups: [], ungrouped: [] }

function toItem(row) {
  return {
    id: row.id,
    url: row.url,
    imageSrc: row.image_src,
    name: row.name,
    addedAt: row.added_at,
  }
}

async function fetchStore() {
  const [{ data: groups, error: ge }, { data: items, error: ie }] =
    await Promise.all([
      supabase.from('groups').select('*').order('created_at'),
      supabase.from('items').select('*').order('added_at'),
    ])
  if (ge) throw ge
  if (ie) throw ie

  store.groups = (groups || []).map((g) => ({
    id: g.id,
    name: g.name,
    items: (items || []).filter((i) => i.group_id === g.id).map(toItem),
  }))
  store.ungrouped = (items || []).filter((i) => !i.group_id).map(toItem)
}

async function addGroup(name) {
  const { data, error } = await supabase
    .from('groups')
    .insert({ name: name.trim() })
    .select()
    .single()
  if (error) throw error
  store.groups.push({ id: data.id, name: data.name, items: [] })
  return data.id
}

async function saveWishlistItem(groupId) {
  const idx = state.selectedIndex
  if (idx === null || !state.images[idx]) return
  const { data, error } = await supabase
    .from('items')
    .insert({
      group_id: groupId,
      url: state.url,
      image_src: state.images[idx].src,
      name: state.itemName.trim() || null,
      added_at: Date.now(),
    })
    .select()
    .single()
  if (error) throw error
  const item = toItem(data)
  if (groupId === null) {
    store.ungrouped.push(item)
  } else {
    const g = store.groups.find((x) => x.id === groupId)
    if (g) g.items.push(item)
  }
}

function resetFlow() {
  state.view = 'wishlist'
  state.url = ''
  state.itemName = ''
  state.itemNameManuallyEdited = false
  state.images = []
  state.selectedIndex = null
  state.loading = false
  state.error = ''
  state.selectedGroupId = null
  state.newGroupName = ''
}

function getAllWishlistItems() {
  const items = []
  for (const it of store.ungrouped) {
    items.push({ ...it, groupName: null })
  }
  for (const g of store.groups) {
    for (const it of g.items) {
      items.push({ ...it, groupName: g.name })
    }
  }
  items.sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0))
  return items
}

function parseUrl(input) {
  const trimmed = input.trim()
  if (!trimmed) return null
  try {
    const withProto =
      trimmed.startsWith('http://') || trimmed.startsWith('https://')
        ? trimmed
        : `https://${trimmed}`
    return new URL(withProto)
  } catch {
    return null
  }
}

function nameFromUrl(urlString) {
  try {
    const u = new URL(urlString)
    const segments = u.pathname.split('/').filter(Boolean)
    if (!segments.length) return ''
    const last = segments[segments.length - 1]
    const clean = last.replace(/\.[^.]+$/, '')
    const spaced = clean.replace(/[-_]+/g, ' ').trim()
    if (!spaced) return ''
    return spaced.charAt(0).toUpperCase() + spaced.slice(1)
  } catch {
    return ''
  }
}

function pushUrl(raw, pageUrl, seen, out) {
  if (!raw || typeof raw !== 'string') return
  let s = raw.trim()
  if (!s || s.startsWith('data:') || s.startsWith('blob:')) return
  if (s.startsWith('//')) s = 'https:' + s
  try {
    const absolute = new URL(s, pageUrl).href
    if (!/^https?:\/\//i.test(absolute)) return
    if (seen.has(absolute)) return
    seen.add(absolute)
    out.push(absolute)
  } catch {
    /* ignore */
  }
}

function firstFromSrcset(srcset) {
  if (!srcset || typeof srcset !== 'string') return null
  const part = srcset.split(',')[0]?.trim()
  if (!part) return null
  const url = part.split(/\s+/)[0]
  return url || null
}

function collectImageUrls(html, pageUrl) {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const seen = new Set()
  const out = []

  for (const meta of doc.querySelectorAll(
    'meta[property="og:image"], meta[property="og:image:secure_url"], meta[name="twitter:image"], meta[name="twitter:image:src"]'
  )) {
    pushUrl(meta.getAttribute('content'), pageUrl, seen, out)
    if (out.length >= 64) return out.slice(0, 48)
  }

  for (const script of doc.querySelectorAll(
    'script[type="application/ld+json"]'
  )) {
    const text = script.textContent?.trim()
    if (!text) continue
    try {
      const data = JSON.parse(text)
      const stack = Array.isArray(data) ? data : [data]
      for (const node of stack) {
        if (!node || typeof node !== 'object') continue
        const img = node.image
        if (typeof img === 'string') pushUrl(img, pageUrl, seen, out)
        else if (Array.isArray(img))
          for (const x of img)
            if (typeof x === 'string') pushUrl(x, pageUrl, seen, out)
            else if (x?.url) pushUrl(x.url, pageUrl, seen, out)
        else if (img?.url) pushUrl(img.url, pageUrl, seen, out)
      }
    } catch {
      /* invalid JSON-LD */
    }
    if (out.length >= 64) return out.slice(0, 48)
  }

  const flat = html.replace(/\\\//g, '/')
  const shopifyFile =
    /https?:\/\/[^"'\\\s<>]+?\/cdn\/shop\/files\/[^"'\\\s<>]+\.(?:jpg|jpeg|png|webp)(?:\?[^"'\\\s<>]*)?/gi
  let m
  while ((m = shopifyFile.exec(flat)) !== null) {
    pushUrl(m[0], pageUrl, seen, out)
    if (out.length >= 64) break
  }

  for (const el of doc.querySelectorAll('img, picture source')) {
    const candidates = [
      el.getAttribute('src'),
      el.getAttribute('data-src'),
      el.getAttribute('data-lazy-src'),
      firstFromSrcset(el.getAttribute('srcset')),
    ]
    for (const c of candidates) {
      pushUrl(c, pageUrl, seen, out)
      if (out.length >= 64) return out.slice(0, 48)
    }
  }

  return out.slice(0, 48)
}

async function fetchPageHtml(urlString) {
  let lastErr = null
  for (const buildProxy of PROXIES) {
    try {
      const res = await fetch(buildProxy(urlString))
      if (!res.ok) {
        lastErr = new Error(`Could not load this page (${res.status}).`)
        continue
      }
      const raw = await res.text()
      let html = raw
      const trimmed = raw.trimStart()
      if (trimmed.startsWith('{')) {
        try {
          const data = JSON.parse(raw)
          if (typeof data.contents === 'string' && data.contents.length) {
            html = data.contents
          }
        } catch {
          /* use raw */
        }
      }
      if (html.length > 400 && /<html[\s>]/i.test(html)) {
        return html
      }
      lastErr = new Error('Could not load this page.')
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e))
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error('Could not load this page.')
}

const grayPlaceholder =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="533"><rect fill="#f2f2f7" width="100%" height="100%"/></svg>'
  )

function placeholderImages(count = 6) {
  return Array.from({ length: count }, () => ({
    src: grayPlaceholder,
    placeholder: true,
  }))
}

async function loadImagesForUrl(urlString) {
  state.loading = true
  state.error = ''
  state.images = []
  state.selectedIndex = null
  render()

  try {
    const pageUrl = new URL(urlString)
    const html = await fetchPageHtml(pageUrl.href)
    const urls = collectImageUrls(html, pageUrl.href)
    state.images = urls.length
      ? urls.map((src) => ({ src, placeholder: false }))
      : placeholderImages()
    if (!urls.length) {
      state.error =
        'No images found on this page. Showing placeholders — try another product URL.'
    }
  } catch (e) {
    state.error =
      e instanceof Error
        ? e.message
        : 'Could not load images. Check the URL or your connection.'
    state.images = placeholderImages()
  } finally {
    state.loading = false
    render()
  }
}

// ── Icons ────────────────────────────────────────────────────────────────────

function closeIcon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>`
}

function chevronLeftIcon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M15 18l-6-6 6-6"/></svg>`
}

function checkIcon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>`
}

function gridViewIcon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg>`
}

function listViewIcon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1.5" fill="currentColor"/><circle cx="4" cy="12" r="1.5" fill="currentColor"/><circle cx="4" cy="18" r="1.5" fill="currentColor"/></svg>`
}

// ── Render ───────────────────────────────────────────────────────────────────

function renderLoading() {
  return `
    <div class="screen" style="align-items:center;justify-content:center;">
      <div class="spinner" aria-hidden="true"></div>
    </div>
  `
}

function renderWishlist() {
  const items = getAllWishlistItems()
  const grid = state.wishlistLayout === 'grid'
  const gridActive = grid ? ' icon-btn--toggle-active' : ''
  const listActive = !grid ? ' icon-btn--toggle-active' : ''

  let body
  if (!items.length) {
    body = `<div class="wishlist-empty"><p class="wishlist-empty__title">Nothing here yet</p><p class="wishlist-empty__hint">Tap + to save something from a link.</p></div>`
  } else if (grid) {
    body = `<ul class="wishlist-grid">${items
      .map(
        (it) => `
      <li class="wishlist-grid__item">
        <a class="wishlist-card" href="${escapeAttr(it.url)}" target="_blank" rel="noopener noreferrer">
          <span class="wishlist-card__img-wrap">
            <img src="${escapeAttr(it.imageSrc)}" alt="${it.name ? escapeAttr(it.name) : ''}" loading="lazy" decoding="async" onerror="this.style.opacity=0" />
          </span>
        </a>
        ${it.name ? `<p class="wishlist-grid__name">${escapeHtml(it.name)}</p>` : ''}
      </li>`
      )
      .join('')}</ul>`
  } else {
    body = `<ul class="wishlist-list">${items
      .map((it) => {
        let host = it.url
        try {
          host = new URL(it.url).hostname.replace(/^www\./, '')
        } catch {
          /* keep */
        }
        return `
      <li>
        <a class="wishlist-row" href="${escapeAttr(it.url)}" target="_blank" rel="noopener noreferrer">
          <span class="wishlist-row__thumb">
            <img src="${escapeAttr(it.imageSrc)}" alt="" loading="lazy" decoding="async" onerror="this.style.opacity=0" />
          </span>
          <span class="wishlist-row__text">
            ${it.name ? `<span class="wishlist-row__name">${escapeHtml(it.name)}</span>` : ''}
            <span class="wishlist-row__host${it.name ? ' wishlist-row__host--secondary' : ''}">${escapeHtml(host)}</span>
            ${it.groupName ? `<span class="wishlist-row__group">${escapeHtml(it.groupName)}</span>` : ''}
          </span>
        </a>
      </li>`
      })
      .join('')}</ul>`
  }

  return `
    <div class="screen screen--home" data-view="wishlist">
      <header class="header header--wishlist">
        <h1 class="header__title header__title--home">My wishlist</h1>
        <div class="view-toggle" role="toolbar" aria-label="View layout">
          <button type="button" class="icon-btn icon-btn--toggle${gridActive}" id="btn-view-grid" aria-pressed="${grid}" aria-label="Grid view">${gridViewIcon()}</button>
          <button type="button" class="icon-btn icon-btn--toggle${listActive}" id="btn-view-list" aria-pressed="${!grid}" aria-label="List view">${listViewIcon()}</button>
        </div>
      </header>
      <div class="main main--home main--scroll">${body}</div>
      <button type="button" class="fab" id="fab-add" aria-label="Add item from link">
        <span class="fab__icon" aria-hidden="true">+</span>
      </button>
    </div>
  `
}

function renderAdd() {
  const parsed = parseUrl(state.url)
  const canContinue = Boolean(parsed)

  return `
    <div class="screen" data-view="add">
      <header class="header">
        <button type="button" class="icon-btn" id="btn-close-add" aria-label="Close">${closeIcon()}</button>
        <h1 class="header__title">Add a link</h1>
        <span aria-hidden="true"></span>
      </header>
      <div class="main">
        <label class="label" for="url-input">URL link</label>
        <input
          id="url-input"
          class="field"
          type="url"
          inputmode="url"
          autocomplete="url"
          placeholder="https://example.com"
          value="${escapeAttr(state.url)}"
        />
        <p class="hint">Paste a link to a clothing product page.</p>
        <label class="label label--spaced" for="name-input">Item name</label>
        <input
          id="name-input"
          class="field"
          type="text"
          autocomplete="off"
          placeholder="e.g. Lana dress stone"
          value="${escapeAttr(state.itemName)}"
        />
      </div>
      <div class="footer">
        <button type="button" class="btn btn--primary" id="btn-continue-add" ${canContinue ? '' : 'disabled'}>
          Continue
        </button>
      </div>
    </div>
  `
}

function renderSelect() {
  const hasSelection = state.selectedIndex !== null
  const items = state.images.map((item, i) => {
    const selected = state.selectedIndex === i
    return `
      <li>
        <button
          type="button"
          class="tile ${selected ? 'tile--selected' : ''}"
          data-index="${i}"
          aria-pressed="${selected}"
          aria-label="Product image ${i + 1}${selected ? ', selected' : ''}"
        >
          <img src="${escapeAttr(item.src)}" alt="" loading="lazy" decoding="async" onerror="this.style.opacity=0" />
          ${selected ? `<span class="tile__check">${checkIcon()}</span>` : ''}
        </button>
      </li>
    `
  })

  const gridContent = state.loading
    ? `<div class="status" role="status"><div class="spinner" aria-hidden="true"></div>Loading images…</div>`
    : `<ul class="image-grid">${items.join('')}</ul>`

  return `
    <div class="screen" data-view="select">
      <header class="header">
        <button type="button" class="icon-btn" id="btn-close-select" aria-label="Back">${closeIcon()}</button>
        <h1 class="header__title">Select an image</h1>
        <span aria-hidden="true"></span>
      </header>
      <div class="main grid-scroll">
        ${state.error ? `<p class="error" role="alert">${escapeHtml(state.error)}</p>` : ''}
        ${gridContent}
      </div>
      <div class="footer">
        <button type="button" class="btn btn--primary" id="btn-continue-select" ${hasSelection && !state.loading ? '' : 'disabled'}>
          Continue
        </button>
      </div>
    </div>
  `
}

function renderGroup() {
  const canContinue = Boolean(state.selectedGroupId)
  const groupRows = store.groups
    .map((g) => {
      const n = g.items?.length ?? 0
      const label = n === 1 ? '1 item' : `${n} items`
      const sel = state.selectedGroupId === g.id
      return `
        <li>
          <button
            type="button"
            class="group-card ${sel ? 'group-card--selected' : ''}"
            data-group-id="${escapeAttr(g.id)}"
            aria-pressed="${sel}"
          >
            <span class="group-card__title">${escapeHtml(g.name)}</span>
            <span class="group-card__meta">${label}</span>
          </button>
        </li>
      `
    })
    .join('')

  return `
    <div class="screen screen--footer-stack" data-view="group">
      <header class="header">
        <button type="button" class="icon-btn" id="btn-close-group" aria-label="Close">${closeIcon()}</button>
        <h1 class="header__title">Add to a group</h1>
        <span aria-hidden="true"></span>
      </header>
      <div class="main main--scroll">
        <ul class="group-list">
          ${groupRows}
          <li>
            <button type="button" class="group-card group-card--action" id="btn-goto-create-group">
              <span class="group-card__plus" aria-hidden="true">+</span>
              Create new group
            </button>
          </li>
        </ul>
      </div>
      <div class="footer footer--stack">
        <button type="button" class="btn btn--primary" id="btn-continue-group" ${canContinue ? '' : 'disabled'}>
          Continue
        </button>
        <button type="button" class="btn btn--secondary" id="btn-skip-group">
          Skip for now
        </button>
      </div>
    </div>
  `
}

function renderCreateGroup() {
  const name = state.newGroupName
  const canCreate = Boolean(name.trim())

  return `
    <div class="screen" data-view="createGroup">
      <header class="header">
        <button type="button" class="icon-btn" id="btn-back-create-group" aria-label="Back">${chevronLeftIcon()}</button>
        <h1 class="header__title">Create new group</h1>
        <span aria-hidden="true"></span>
      </header>
      <div class="main">
        <label class="label" for="group-name-input">Group name</label>
        <input
          id="group-name-input"
          class="field"
          type="text"
          autocomplete="off"
          placeholder="Going out tops, beauty, home decor"
          value="${escapeAttr(name)}"
        />
      </div>
      <div class="footer">
        <button type="button" class="btn btn--primary" id="btn-submit-create-group" ${canCreate ? '' : 'disabled'}>
          Create group
        </button>
      </div>
    </div>
  `
}

function escapeAttr(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function render() {
  const root = document.querySelector('#app')
  switch (state.view) {
    case 'loading':
      root.innerHTML = renderLoading()
      break
    case 'wishlist':
      root.innerHTML = renderWishlist()
      break
    case 'add':
      root.innerHTML = renderAdd()
      break
    case 'select':
      root.innerHTML = renderSelect()
      break
    case 'group':
      root.innerHTML = renderGroup()
      break
    case 'createGroup':
      root.innerHTML = renderCreateGroup()
      break
    default:
      root.innerHTML = renderWishlist()
  }
  bind()
}

function bind() {
  if (state.view === 'wishlist') {
    document.querySelector('#fab-add')?.addEventListener('click', () => {
      state.url = ''
      state.itemName = ''
      state.itemNameManuallyEdited = false
      state.images = []
      state.selectedIndex = null
      state.error = ''
      state.selectedGroupId = null
      state.newGroupName = ''
      state.view = 'add'
      render()
    })

    document.querySelector('#btn-view-grid')?.addEventListener('click', () => {
      state.wishlistLayout = 'grid'
      render()
    })

    document.querySelector('#btn-view-list')?.addEventListener('click', () => {
      state.wishlistLayout = 'list'
      render()
    })
    return
  }

  if (state.view === 'add') {
    const input = document.querySelector('#url-input')
    const nameInput = document.querySelector('#name-input')
    const btnContinue = document.querySelector('#btn-continue-add')
    const btnClose = document.querySelector('#btn-close-add')

    input?.addEventListener('input', (e) => {
      state.url = e.target.value
      const ok = parseUrl(state.url)
      btnContinue.disabled = !ok
      if (ok && !state.itemNameManuallyEdited) {
        state.itemName = nameFromUrl(ok.href)
        if (nameInput) nameInput.value = state.itemName
      }
    })

    nameInput?.addEventListener('input', (e) => {
      state.itemName = e.target.value
      state.itemNameManuallyEdited = true
    })

    btnContinue?.addEventListener('click', () => {
      const u = parseUrl(state.url)
      if (!u) return
      state.url = u.href
      state.view = 'select'
      loadImagesForUrl(state.url)
    })

    btnClose?.addEventListener('click', () => {
      state.url = ''
      state.itemName = ''
      state.itemNameManuallyEdited = false
      state.error = ''
      input.value = ''
      btnContinue.disabled = true
      state.view = 'wishlist'
      render()
    })
    return
  }

  if (state.view === 'select') {
    document.querySelectorAll('.tile').forEach((btn) => {
      btn.addEventListener('click', () => {
        const i = Number(btn.dataset.index)
        state.selectedIndex = state.selectedIndex === i ? null : i
        render()
      })
    })

    document.querySelector('#btn-close-select')?.addEventListener('click', () => {
      state.view = 'add'
      state.images = []
      state.selectedIndex = null
      state.error = ''
      render()
    })

    document
      .querySelector('#btn-continue-select')
      ?.addEventListener('click', () => {
        if (state.selectedIndex === null) return
        state.selectedGroupId = null
        state.view = 'group'
        render()
      })
    return
  }

  if (state.view === 'group') {
    document.querySelectorAll('.group-card[data-group-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.selectedGroupId = btn.dataset.groupId
        render()
      })
    })

    document
      .querySelector('#btn-goto-create-group')
      ?.addEventListener('click', () => {
        state.newGroupName = ''
        state.view = 'createGroup'
        render()
      })

    document
      .querySelector('#btn-close-group')
      ?.addEventListener('click', () => {
        resetFlow()
        render()
      })

    document
      .querySelector('#btn-continue-group')
      ?.addEventListener('click', async () => {
        if (!state.selectedGroupId) return
        await saveWishlistItem(state.selectedGroupId)
        resetFlow()
        render()
      })

    document
      .querySelector('#btn-skip-group')
      ?.addEventListener('click', async () => {
        await saveWishlistItem(null)
        resetFlow()
        render()
      })
    return
  }

  if (state.view === 'createGroup') {
    const input = document.querySelector('#group-name-input')
    const btnSubmit = document.querySelector('#btn-submit-create-group')

    input?.addEventListener('input', (e) => {
      state.newGroupName = e.target.value
      btnSubmit.disabled = !state.newGroupName.trim()
    })

    document
      .querySelector('#btn-back-create-group')
      ?.addEventListener('click', () => {
        state.newGroupName = ''
        state.view = 'group'
        render()
      })

    document
      .querySelector('#btn-submit-create-group')
      ?.addEventListener('click', async () => {
        const name = state.newGroupName.trim()
        if (!name) return
        const id = await addGroup(name)
        state.newGroupName = ''
        state.selectedGroupId = id
        state.view = 'group'
        render()
      })
  }
}

// ── Boot ─────────────────────────────────────────────────────────────────────

async function init() {
  render() // show loading spinner
  await fetchStore()
  state.view = 'wishlist'
  render()
}

init()
