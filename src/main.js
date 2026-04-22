import { createClient } from '@supabase/supabase-js';
import './style.css';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

const PROXIES = [(target) => '/api/proxy?url=' + encodeURIComponent(target)];

/** Thumbnail for “your own” emoji cards */
const EMOJI_CARD_BACKGROUNDS = [
  '#E8E4E1',
  '#C9DCE9',
  '#D4E5D7',
  '#E5D4E8',
  '#F3E5C8',
  '#1a1a1a',
  '#f2f2f7',
  '#2c3e50',
];
const EMOJI_CARD_EMOJIS = [
  '🛍️',
  '👟',
  '👕',
  '👗',
  '👜',
  '🧢',
  '⌚',
  '👓',
  '💼',
  '👔',
];

const state = {
  view: 'loading',
  /** Main bottom nav: wishlist list, search, or profile */
  mainTab: 'wishlist',
  /** null = All items; string = group id when user has groups */
  wishlistGroupFilter: null,
  searchQuery: '',
  wishlistLayout: 'grid',
  url: '',
  itemName: '',
  itemNameManuallyEdited: false,
  /** Background for the next emoji card the user adds */
  customCardColor: EMOJI_CARD_BACKGROUNDS[0],
  customizeSheetOpen: false,
  /** "menu" | "emoji" */
  customizeSheetPanel: 'menu',
  images: [],
  selectedIndex: null,
  loading: false,
  error: '',
  selectedGroupId: null,
  newGroupName: '',
  /** Profile (until auth): display + @handle shown on profile tab */
  profileDisplayName: 'Your name',
  profileHandle: '@yourhandle',
};

// In-memory store — kept in sync with Supabase
let store = { groups: [], ungrouped: [] };

function toItem(row) {
  return {
    id: row.id,
    url: row.url,
    imageSrc: row.image_src,
    name: row.name,
    addedAt: row.added_at,
  };
}

async function fetchStore() {
  const [{ data: groups, error: ge }, { data: items, error: ie }] =
    await Promise.all([
      supabase.from('groups').select('*').order('created_at'),
      supabase.from('items').select('*').order('added_at'),
    ]);
  if (ge) throw ge;
  if (ie) throw ie;

  store.groups = (groups || []).map((g) => ({
    id: g.id,
    name: g.name,
    items: (items || []).filter((i) => i.group_id === g.id).map(toItem),
  }));
  store.ungrouped = (items || []).filter((i) => !i.group_id).map(toItem);
}

async function addGroup(name) {
  const { data, error } = await supabase
    .from('groups')
    .insert({ name: name.trim() })
    .select()
    .single();
  if (error) throw error;
  store.groups.push({ id: data.id, name: data.name, items: [] });
  return data.id;
}

async function saveWishlistItem(groupId) {
  const idx = state.selectedIndex;
  if (idx === null || !state.images[idx]) return;
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
    .single();
  if (error) throw error;
  const item = toItem(data);
  if (groupId === null) {
    store.ungrouped.push(item);
  } else {
    const g = store.groups.find((x) => x.id === groupId);
    if (g) g.items.push(item);
  }
}

function resetFlow() {
  state.view = 'wishlist';
  state.url = '';
  state.itemName = '';
  state.itemNameManuallyEdited = false;
  state.customCardColor = EMOJI_CARD_BACKGROUNDS[0];
  state.customizeSheetOpen = false;
  state.customizeSheetPanel = 'menu';
  state.images = [];
  state.selectedIndex = null;
  state.loading = false;
  state.error = '';
  state.selectedGroupId = null;
  state.newGroupName = '';
}

function getAllWishlistItems() {
  const items = [];
  for (const it of store.ungrouped) {
    items.push({ ...it, groupName: null, groupId: null });
  }
  for (const g of store.groups) {
    for (const it of g.items) {
      items.push({ ...it, groupName: g.name, groupId: g.id });
    }
  }
  items.sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0));
  return items;
}

function getWishlistItemsForCurrentFilter() {
  const all = getAllWishlistItems();
  if (!state.wishlistGroupFilter) return all;
  return all.filter((it) => it.groupId === state.wishlistGroupFilter);
}

function profileInitials(displayName) {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return parts[0]?.charAt(0)?.toUpperCase() || '?';
}

function filterItemsBySearch(items, q) {
  const needle = q.trim().toLowerCase();
  if (!needle) return items;
  return items.filter((it) => {
    const name = (it.name || '').toLowerCase();
    let host = '';
    try {
      host = new URL(it.url).hostname.replace(/^www\./, '').toLowerCase();
    } catch {
      host = String(it.url).toLowerCase();
    }
    const group = (it.groupName || '').toLowerCase();
    return (
      name.includes(needle) || host.includes(needle) || group.includes(needle)
    );
  });
}

function parseUrl(input) {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const withProto =
      trimmed.startsWith('http://') || trimmed.startsWith('https://')
        ? trimmed
        : `https://${trimmed}`;
    return new URL(withProto);
  } catch {
    return null;
  }
}

function nameFromUrl(urlString) {
  try {
    const u = new URL(urlString);
    const segments = u.pathname.split('/').filter(Boolean);
    if (!segments.length) return '';
    const last = segments[segments.length - 1];
    const clean = last.replace(/\.[^.]+$/, '');
    const spaced = clean.replace(/[-_]+/g, ' ').trim();
    if (!spaced) return '';
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
  } catch {
    return '';
  }
}

function cleanProductTitle(raw) {
  if (!raw) return '';
  let s = raw.replace(/\s+/g, ' ').trim();
  if (s.includes(' | ')) s = s.split(' | ')[0].trim();
  else if (s.includes(' – ')) s = s.split(' – ')[0].trim();
  if (s.length > 120) s = s.slice(0, 119) + '…';
  return s;
}

function extractProductName(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const og = doc
    .querySelector('meta[property="og:title"]')
    ?.getAttribute('content');
  const tw = doc
    .querySelector('meta[name="twitter:title"]')
    ?.getAttribute('content');
  const titleEl = doc.querySelector('title');
  const t = titleEl?.textContent;
  const raw = (og && og.trim()) || (tw && tw.trim()) || (t && t.trim()) || '';
  return cleanProductTitle(raw);
}

function isValidCardBg(hex) {
  return (
    typeof hex === 'string' && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/i.test(hex)
  );
}

function generateEmojiCardDataUrl(emoji, bg) {
  const fill = isValidCardBg(bg) ? bg : EMOJI_CARD_BACKGROUNDS[0];
  const safe = (s) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="533"><rect fill="${fill}" width="100%" height="100%"/><text x="50%" y="52%" font-size="120" text-anchor="middle" dominant-baseline="middle" font-family="system-ui,Apple Color Emoji,Segoe UI Emoji,Noto Color Emoji,sans-serif">${safe(emoji)}</text></svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

function fileToResizedJpegDataUrl(file, maxEdge = 1200) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width < 1 || height < 1) {
        reject(new Error('Invalid image size'));
        return;
      }
      if (width > maxEdge || height > maxEdge) {
        if (width > height) {
          height = (height * maxEdge) / width;
          width = maxEdge;
        } else {
          width = (width * maxEdge) / height;
          height = maxEdge;
        }
      }
      const c = document.createElement('canvas');
      c.width = Math.round(width);
      c.height = Math.round(height);
      const ctx = c.getContext('2d');
      if (!ctx) {
        reject(new Error('No canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/jpeg', 0.88));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read the image file'));
    };
    img.src = url;
  });
}

function pushUrl(raw, pageUrl, seen, out) {
  if (!raw || typeof raw !== 'string') return;
  let s = raw.trim();
  if (!s || s.startsWith('data:') || s.startsWith('blob:')) return;
  if (s.startsWith('//')) s = 'https:' + s;
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

function firstFromSrcset(srcset) {
  if (!srcset || typeof srcset !== 'string') return null;
  const part = srcset.split(',')[0]?.trim();
  if (!part) return null;
  const url = part.split(/\s+/)[0];
  return url || null;
}

function collectImageUrls(html, pageUrl) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const seen = new Set();
  const out = [];

  for (const meta of doc.querySelectorAll(
    'meta[property="og:image"], meta[property="og:image:secure_url"], meta[name="twitter:image"], meta[name="twitter:image:src"]',
  )) {
    pushUrl(meta.getAttribute('content'), pageUrl, seen, out);
    if (out.length >= 64) return out.slice(0, 48);
  }

  for (const script of doc.querySelectorAll(
    'script[type="application/ld+json"]',
  )) {
    const text = script.textContent?.trim();
    if (!text) continue;
    try {
      const data = JSON.parse(text);
      const stack = Array.isArray(data) ? data : [data];
      for (const node of stack) {
        if (!node || typeof node !== 'object') continue;
        const img = node.image;
        if (typeof img === 'string') pushUrl(img, pageUrl, seen, out);
        else if (Array.isArray(img))
          for (const x of img)
            if (typeof x === 'string') pushUrl(x, pageUrl, seen, out);
            else if (x?.url) pushUrl(x.url, pageUrl, seen, out);
            else if (img?.url) pushUrl(img.url, pageUrl, seen, out);
      }
    } catch {
      /* invalid JSON-LD */
    }
    if (out.length >= 64) return out.slice(0, 48);
  }

  const flat = html.replace(/\\\//g, '/');
  const shopifyFile =
    /https?:\/\/[^"'\\\s<>]+?\/cdn\/shop\/files\/[^"'\\\s<>]+\.(?:jpg|jpeg|png|webp)(?:\?[^"'\\\s<>]*)?/gi;
  let m;
  while ((m = shopifyFile.exec(flat)) !== null) {
    pushUrl(m[0], pageUrl, seen, out);
    if (out.length >= 64) break;
  }

  for (const el of doc.querySelectorAll('img, picture source')) {
    const candidates = [
      el.getAttribute('src'),
      el.getAttribute('data-src'),
      el.getAttribute('data-lazy-src'),
      firstFromSrcset(el.getAttribute('srcset')),
    ];
    for (const c of candidates) {
      pushUrl(c, pageUrl, seen, out);
      if (out.length >= 64) return out.slice(0, 48);
    }
  }

  return out.slice(0, 48);
}

/**
 * @returns {{ ok: true, html: string, status: number } | { ok: false, status: number, error: Error }}
 */
async function fetchPageHtml(urlString) {
  let lastErr = null;
  let lastStatus = 0;
  for (const buildProxy of PROXIES) {
    try {
      const res = await fetch(buildProxy(urlString));
      lastStatus = res.status;
      if (!res.ok) {
        lastErr = new Error(`Could not load this page (${res.status}).`);
        continue;
      }
      const raw = await res.text();
      let html = raw;
      const trimmed = raw.trimStart();
      if (trimmed.startsWith('{')) {
        try {
          const data = JSON.parse(raw);
          if (typeof data.contents === 'string' && data.contents.length) {
            html = data.contents;
          }
        } catch {
          /* use raw */
        }
      }
      if (html.length > 400 && /<html[\s>]/i.test(html)) {
        return { ok: true, html, status: res.status };
      }
      lastErr = new Error('Could not load this page.');
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
    }
  }
  return {
    ok: false,
    status: lastStatus,
    error:
      lastErr instanceof Error
        ? lastErr
        : new Error('Could not load this page.'),
  };
}

const grayPlaceholder =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="533"><rect fill="#f2f2f7" width="100%" height="100%"/></svg>',
  );

function placeholderImages(count = 6) {
  return Array.from({ length: count }, () => ({
    src: grayPlaceholder,
    placeholder: true,
  }));
}

function closeCustomizeSheet() {
  state.customizeSheetOpen = false;
  state.customizeSheetPanel = 'menu';
}

async function loadImagesForUrl(urlString) {
  closeCustomizeSheet();
  state.loading = true;
  state.error = '';
  state.images = [];
  state.selectedIndex = null;
  render();

  const pageUrl = new URL(urlString);
  const result = await fetchPageHtml(pageUrl.href);
  if (result.ok) {
    const suggested = extractProductName(result.html);
    if (suggested && !state.itemNameManuallyEdited) {
      state.itemName = suggested;
    }
    const urls = collectImageUrls(result.html, pageUrl.href);
    state.images = urls.length
      ? urls.map((src) => ({ src, placeholder: false }))
      : placeholderImages();
    if (!urls.length) {
      state.error =
        'No images were found in the page HTML. Tap Customize on the first card to add your own.';
    }
  } else {
    const st = result.status;
    state.error =
      st === 403 || st === 401
        ? 'This store blocked automatic preview. Tap Customize on the first card to upload a photo or use an emoji.'
        : result.error.message;
    if (!state.error) {
      state.error =
        'Could not load this page. Tap Customize on the first card to add your own image or emoji.';
    }
    state.images = placeholderImages();
  }

  state.loading = false;
  render();
}

// ── Icons ────────────────────────────────────────────────────────────────────

function closeIcon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>`;
}

function chevronLeftIcon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M15 18l-6-6 6-6"/></svg>`;
}

function checkIcon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>`;
}

function gridViewIcon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg>`;
}

function listViewIcon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1.5" fill="currentColor"/><circle cx="4" cy="12" r="1.5" fill="currentColor"/><circle cx="4" cy="18" r="1.5" fill="currentColor"/></svg>`;
}

function wishlistTabIcon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>`;
}

function searchTabIcon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>`;
}

function profileTabIcon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>`;
}

function profileCardChevronIcon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path stroke="#AEAEB2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M9 6l6 6-6 6"/></svg>`;
}

// ── Render ───────────────────────────────────────────────────────────────────

function renderLoading() {
  return `
    <div class="screen" style="align-items:center;justify-content:center;">
      <div class="spinner" aria-hidden="true"></div>
    </div>
  `;
}

function renderWishlistItemsBody(items) {
  const grid = state.wishlistLayout === 'grid';
  if (!items.length) {
    const hasOther =
      state.wishlistGroupFilter && getAllWishlistItems().length > 0;
    if (hasOther) {
      return `<div class="wishlist-empty"><p class="wishlist-empty__title">No items in this group</p><p class="wishlist-empty__hint">Switch tabs or tap + to add something here.</p></div>`;
    }
    return `<div class="wishlist-empty"><p class="wishlist-empty__title">Nothing here yet</p><p class="wishlist-empty__hint">Tap + to save something from a link.</p></div>`;
  }
  if (grid) {
    return `<ul class="wishlist-grid">${items
      .map(
        (it) => `
      <li class="wishlist-grid__item">
        <a class="wishlist-card" href="${escapeAttr(it.url)}" target="_blank" rel="noopener noreferrer">
          <span class="wishlist-card__img-wrap">
            <img src="${escapeAttr(it.imageSrc)}" alt="${it.name ? escapeAttr(it.name) : ''}" loading="lazy" decoding="async" onerror="this.style.opacity=0" />
          </span>
        </a>
      </li>`,
      )
      .join('')}</ul>`;
  }
  return `<ul class="wishlist-list">${items
    .map((it) => {
      let host = it.url;
      try {
        host = new URL(it.url).hostname.replace(/^www\./, '');
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
      </li>`;
    })
    .join('')}</ul>`;
}

function renderWishlistGroupTabs() {
  if (!store.groups.length) return '';
  if (
    state.wishlistGroupFilter &&
    !store.groups.some((g) => g.id === state.wishlistGroupFilter)
  ) {
    state.wishlistGroupFilter = null;
  }
  const allActive = !state.wishlistGroupFilter;
  const tabs = [
    `<button type="button" role="tab" class="wishlist-filter-tab${allActive ? ' wishlist-filter-tab--selected' : ''}" id="wishlist-tab-all" data-wishlist-filter="" aria-selected="${allActive}" aria-controls="wishlist-main">All items</button>`,
    ...store.groups.map((g) => {
      const on = state.wishlistGroupFilter === g.id;
      return `<button type="button" role="tab" class="wishlist-filter-tab${on ? ' wishlist-filter-tab--selected' : ''}" id="wishlist-tab-${escapeAttr(g.id)}" data-wishlist-filter="${escapeAttr(g.id)}" aria-selected="${on}" aria-controls="wishlist-main">${escapeHtml(g.name)}</button>`;
    }),
  ];
  return `
    <div class="wishlist-filter-tabs-wrap">
      <div class="wishlist-filter-tabs" role="tablist" aria-label="Filter by group">
        ${tabs.join('')}
      </div>
    </div>
  `;
}

function renderBottomNav() {
  const w = state.mainTab === 'wishlist' ? ' bottom-nav__btn--active' : '';
  const s = state.mainTab === 'search' ? ' bottom-nav__btn--active' : '';
  const p = state.mainTab === 'profile' ? ' bottom-nav__btn--active' : '';
  return `
    <div class="bottom-nav-dock">
      <div class="bottom-nav-dock__row">
        <nav class="bottom-nav" aria-label="Main navigation">
          <button type="button" class="bottom-nav__btn${w}" id="nav-wishlist" data-main-tab="wishlist" aria-current="${state.mainTab === 'wishlist' ? 'page' : 'false'}">
            <span class="bottom-nav__icon" aria-hidden="true">${wishlistTabIcon()}</span>
          </button>
          <button type="button" class="bottom-nav__btn${s}" id="nav-search" data-main-tab="search" aria-current="${state.mainTab === 'search' ? 'page' : 'false'}">
            <span class="bottom-nav__icon" aria-hidden="true">${searchTabIcon()}</span>
          </button>
          <button type="button" class="bottom-nav__btn${p}" id="nav-profile" data-main-tab="profile" aria-current="${state.mainTab === 'profile' ? 'page' : 'false'}">
            <span class="bottom-nav__icon" aria-hidden="true">${profileTabIcon()}</span>
          </button>
        </nav>
        <button type="button" class="fab fab--dock" id="fab-add" aria-label="Add item from link">
          <span class="fab__icon" aria-hidden="true">+</span>
        </button>
      </div>
    </div>
  `;
}

function renderWishlistBrowse() {
  const items = getWishlistItemsForCurrentFilter();
  const grid = state.wishlistLayout === 'grid';
  const gridActive = grid ? ' icon-btn--toggle-active' : '';
  const listActive = !grid ? ' icon-btn--toggle-active' : '';
  const body = renderWishlistItemsBody(items);

  return `
      <div class="main main--home main--scroll main--wishlist">
        <div class="wishlist-sticky-head">
          <header class="header header--wishlist">
            <h1 class="header__title header__title--home">My wishlist</h1>
            <div class="view-toggle" role="toolbar" aria-label="View layout">
              <button type="button" class="icon-btn icon-btn--toggle${gridActive}" id="btn-view-grid" aria-pressed="${grid}" aria-label="Grid view">${gridViewIcon()}</button>
              <button type="button" class="icon-btn icon-btn--toggle${listActive}" id="btn-view-list" aria-pressed="${!grid}" aria-label="List view">${listViewIcon()}</button>
            </div>
          </header>
          ${renderWishlistGroupTabs()}
        </div>
        <div class="wishlist-body" id="wishlist-main" role="tabpanel">${body}</div>
      </div>
  `;
}

function renderSearchBrowse() {
  const all = getAllWishlistItems();
  const items = filterItemsBySearch(all, state.searchQuery);
  let resultsBody;
  if (!all.length) {
    resultsBody = renderWishlistItemsBody([]);
  } else if (!items.length) {
    resultsBody = `<div class="wishlist-empty"><p class="wishlist-empty__title">No results</p><p class="wishlist-empty__hint">Try another name, store, or group.</p></div>`;
  } else {
    resultsBody = renderWishlistItemsBody(items);
  }

  return `
      <header class="header header--simple">
        <h1 class="header__title header__title--home">Search</h1>
      </header>
      <div class="main main--home main--scroll main--search">
        <label class="sr-only" for="search-input">Search wishlist</label>
        <input
          id="search-input"
          class="field field--search"
          type="search"
          autocomplete="off"
          placeholder="Search items, stores, groups"
          value="${escapeAttr(state.searchQuery)}"
        />
        <div class="search-results">${resultsBody}</div>
      </div>
  `;
}

function groupItemsLabel(n) {
  return n === 1 ? '1 item' : `${n} items`;
}

function renderProfileGroupCards() {
  const groups = store.groups;
  if (!groups.length) {
    return `<p class="profile-wishlist-empty">No groups yet — add items and organize them into groups.</p>`;
  }
  return groups
    .map((g) => {
      const n = g.items?.length ?? 0;
      const items = g.items || [];
      const meta = `
        <div class="profile-group-card__meta">
          <span class="profile-group-card__title">${escapeHtml(g.name)}</span>
          <span class="profile-group-card__count">${escapeHtml(groupItemsLabel(n))}</span>
        </div>`;
      if (n >= 4) {
        const cells = items
          .slice(0, 4)
          .map(
            (it) =>
              `<span class="profile-group-card__mini"><img src="${escapeAttr(it.imageSrc)}" alt="" loading="lazy" decoding="async" /></span>`,
          )
          .join('');
        return `
          <button type="button" class="profile-group-card profile-group-card--quad" data-profile-group="${escapeAttr(g.id)}">
            <div class="profile-group-card__quad" aria-hidden="true">${cells}</div>
            ${meta}
          </button>`;
      }
      const thumb = items[0];
      const img = thumb
        ? `<span class="profile-group-card__thumb-wrap"><img src="${escapeAttr(thumb.imageSrc)}" alt="" loading="lazy" decoding="async" /></span>`
        : `<span class="profile-group-card__thumb-wrap profile-group-card__thumb-wrap--empty"></span>`;
      return `
        <button type="button" class="profile-group-card profile-group-card--row" data-profile-group="${escapeAttr(g.id)}">
          ${img}
          ${meta}
          <span class="profile-group-card__chevron" aria-hidden="true">${profileCardChevronIcon()}</span>
        </button>`;
    })
    .join('');
}

function renderProfileBrowse() {
  const initials = profileInitials(state.profileDisplayName);
  return `
      <header class="header header--profile-top">
        <button type="button" class="icon-btn" id="btn-profile-back" aria-label="Back to wishlist">${chevronLeftIcon()}</button>
        <span class="header__title header__title--profile-spacer" aria-hidden="true"></span>
        <span aria-hidden="true" class="header__slot"></span>
      </header>
      <div class="main main--home main--scroll main--profile">
        <div class="profile-screen">
          <div class="profile-identity">
            <div class="profile-avatar" aria-hidden="true">${escapeHtml(initials)}</div>
            <h1 class="profile-name">${escapeHtml(state.profileDisplayName)}</h1>
            <p class="profile-handle">${escapeHtml(state.profileHandle)}</p>
          </div>
          <section class="profile-wishlist-section" aria-labelledby="profile-wishlist-heading">
            <h2 id="profile-wishlist-heading" class="profile-wishlist-heading">Wishlist</h2>
            <div class="profile-group-list">${renderProfileGroupCards()}</div>
          </section>
        </div>
      </div>
  `;
}

function renderWishlist() {
  let inner;
  if (state.mainTab === 'wishlist') inner = renderWishlistBrowse();
  else if (state.mainTab === 'search') inner = renderSearchBrowse();
  else inner = renderProfileBrowse();

  return `
    <div class="screen screen--home screen--app-shell" data-view="wishlist">
      ${inner}
      ${renderBottomNav()}
    </div>
  `;
}

function renderAdd() {
  const parsed = parseUrl(state.url);
  const canContinue = Boolean(parsed);

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
  `;
}

function renderCustomizeBottomSheet() {
  if (!state.customizeSheetOpen) return '';
  if (state.customizeSheetPanel === 'emoji') {
    return `
    <div
      class="bottom-sheet"
      id="customize-bottom-sheet"
      role="dialog"
      aria-modal="true"
      aria-label="Choose emoji and color"
    >
      <button
        type="button"
        class="bottom-sheet__backdrop"
        id="btn-customize-backdrop"
        aria-label="Dismiss"
        tabindex="-1"
      ></button>
      <div class="bottom-sheet__panel bottom-sheet__panel--emoji" role="document">
        <div class="bottom-sheet__grab" aria-hidden="true"></div>
        <div class="bottom-sheet__header-row">
          <button type="button" class="bottom-sheet__back" id="btn-customize-emoji-back">Back</button>
          <span class="bottom-sheet__title">Choose emoji</span>
        </div>
        <p class="bottom-sheet__sub">Background</p>
        <div class="swatch-row" role="group" aria-label="Background color">
        ${EMOJI_CARD_BACKGROUNDS.map(
          (hex) => `
        <button
          type="button"
          class="swatch ${
            state.customCardColor === hex ? 'swatch--active' : ''
          }"
          data-swatch-color="${escapeAttr(hex)}"
          style="background-color:${hex}"
          aria-pressed="${state.customCardColor === hex}"
          title="${escapeAttr(hex)}"
        ></button>`,
        ).join('')}
        </div>
        <p class="bottom-sheet__sub">Emoji</p>
        <div class="emoji-row" role="group" aria-label="Emoji">
        ${EMOJI_CARD_EMOJIS.map(
          (em) => `
        <button
          type="button"
          class="emoji-tile"
          data-emoji-tile="${escapeAttr(em)}"
          title="Add ${escapeAttr(em)}"
        >
          <span class="emoji-tile__inner" aria-hidden="true">${em}</span>
        </button>`,
        ).join('')}
        </div>
      </div>
    </div>`;
  }
  return `
    <div
      class="bottom-sheet"
      id="customize-bottom-sheet"
      role="dialog"
      aria-modal="true"
      aria-label="Customize"
    >
      <button
        type="button"
        class="bottom-sheet__backdrop"
        id="btn-customize-backdrop"
        aria-label="Dismiss"
        tabindex="-1"
      ></button>
      <div class="bottom-sheet__panel" role="document">
        <div class="bottom-sheet__grab" aria-hidden="true"></div>
        <div class="bottom-sheet__actions">
          <button
            type="button"
            class="bottom-sheet__row"
            id="btn-customize-upload"
          >Upload</button>
          <button
            type="button"
            class="bottom-sheet__row"
            id="btn-customize-choose-emoji"
          >Choose emoji</button>
        </div>
        <button type="button" class="bottom-sheet__cancel" id="btn-customize-cancel">Cancel</button>
      </div>
    </div>
  `;
}

function renderSelect() {
  const hasSelection = state.selectedIndex !== null;
  const firstTile = !state.loading
    ? `
    <li class="image-grid__lead">
      <button
        type="button"
        class="tile--customize"
        id="btn-tile-customize"
        aria-label="Customize, add your own image or emoji"
      >
        <span class="tile--customize__frame" aria-hidden="true">
          <span class="tile--customize__plus">+</span>
          <span class="tile--customize__label">Customize</span>
        </span>
      </button>
    </li>`
    : '';
  const items = state.images.map((item, i) => {
    const selected = state.selectedIndex === i;
    return `
      <li>
        <button
          type="button"
          class="tile ${selected ? 'tile--selected' : ''}"
          data-image-index="${i}"
          aria-pressed="${selected}"
          aria-label="Product image ${i + 1}${selected ? ', selected' : ''}"
        >
          <img src="${escapeAttr(item.src)}" alt="" loading="lazy" decoding="async" onerror="this.style.opacity=0" />
          ${selected ? `<span class="tile__check">${checkIcon()}</span>` : ''}
        </button>
      </li>
    `;
  });

  const gridContent = state.loading
    ? `<div class="status" role="status"><div class="spinner" aria-hidden="true"></div>Loading images…</div>`
    : `<ul class="image-grid">${firstTile}${items.join('')}</ul>`;

  return `
    <div class="screen screen--select" data-view="select">
      <input
        type="file"
        id="file-upload-image"
        class="sr-only"
        accept="image/*"
        aria-hidden="true"
        tabindex="-1"
      />
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
      ${renderCustomizeBottomSheet()}
    </div>
  `;
}

function renderGroup() {
  const canContinue = Boolean(state.selectedGroupId);
  const groupRows = store.groups
    .map((g) => {
      const n = g.items?.length ?? 0;
      const label = n === 1 ? '1 item' : `${n} items`;
      const sel = state.selectedGroupId === g.id;
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
      `;
    })
    .join('');

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
  `;
}

function renderCreateGroup() {
  const name = state.newGroupName;
  const canCreate = Boolean(name.trim());

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
  `;
}

function escapeAttr(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function render() {
  const root = document.querySelector('#app');
  switch (state.view) {
    case 'loading':
      root.innerHTML = renderLoading();
      break;
    case 'wishlist':
      root.innerHTML = renderWishlist();
      break;
    case 'add':
      root.innerHTML = renderAdd();
      break;
    case 'select':
      root.innerHTML = renderSelect();
      break;
    case 'group':
      root.innerHTML = renderGroup();
      break;
    case 'createGroup':
      root.innerHTML = renderCreateGroup();
      break;
    default:
      root.innerHTML = renderWishlist();
  }
  bind();
  document.body.classList.toggle(
    'modal-open',
    state.view === 'select' && state.customizeSheetOpen,
  );
}

function bind() {
  if (state.view === 'wishlist') {
    document.querySelector('#fab-add')?.addEventListener('click', () => {
      state.url = '';
      state.itemName = '';
      state.itemNameManuallyEdited = false;
      state.customCardColor = EMOJI_CARD_BACKGROUNDS[0];
      state.customizeSheetOpen = false;
      state.customizeSheetPanel = 'menu';
      state.images = [];
      state.selectedIndex = null;
      state.error = '';
      state.selectedGroupId = null;
      state.newGroupName = '';
      state.view = 'add';
      render();
    });

    document.querySelectorAll('[data-main-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const t = btn.getAttribute('data-main-tab');
        if (t === 'wishlist' || t === 'search' || t === 'profile') {
          state.mainTab = t;
          render();
        }
      });
    });

    document.querySelectorAll('[data-wishlist-filter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-wishlist-filter') || '';
        state.wishlistGroupFilter = id || null;
        render();
      });
    });

    document.querySelector('#btn-view-grid')?.addEventListener('click', () => {
      state.wishlistLayout = 'grid';
      render();
    });

    document.querySelector('#btn-view-list')?.addEventListener('click', () => {
      state.wishlistLayout = 'list';
      render();
    });

    const searchInput = document.querySelector('#search-input');
    searchInput?.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      render();
      const next = document.querySelector('#search-input');
      if (next) {
        next.focus();
        const len = next.value.length;
        next.setSelectionRange(len, len);
      }
    });

    document
      .querySelector('#btn-profile-back')
      ?.addEventListener('click', () => {
        state.mainTab = 'wishlist';
        render();
      });

    document.querySelectorAll('[data-profile-group]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-profile-group');
        if (!id) return;
        state.mainTab = 'wishlist';
        state.wishlistGroupFilter = id;
        render();
      });
    });

    return;
  }

  if (state.view === 'add') {
    const input = document.querySelector('#url-input');
    const nameInput = document.querySelector('#name-input');
    const btnContinue = document.querySelector('#btn-continue-add');
    const btnClose = document.querySelector('#btn-close-add');

    input?.addEventListener('input', (e) => {
      state.url = e.target.value;
      const ok = parseUrl(state.url);
      btnContinue.disabled = !ok;
      if (ok && !state.itemNameManuallyEdited) {
        state.itemName = nameFromUrl(ok.href);
        if (nameInput) nameInput.value = state.itemName;
      }
    });

    nameInput?.addEventListener('input', (e) => {
      state.itemName = e.target.value;
      state.itemNameManuallyEdited = true;
    });

    btnContinue?.addEventListener('click', () => {
      const u = parseUrl(state.url);
      if (!u) return;
      state.url = u.href;
      state.view = 'select';
      loadImagesForUrl(state.url);
    });

    btnClose?.addEventListener('click', () => {
      state.url = '';
      state.itemName = '';
      state.itemNameManuallyEdited = false;
      state.error = '';
      input.value = '';
      btnContinue.disabled = true;
      state.view = 'wishlist';
      render();
    });
    return;
  }

  if (state.view === 'select') {
    document
      .querySelector('#btn-tile-customize')
      ?.addEventListener('click', () => {
        state.customizeSheetOpen = true;
        state.customizeSheetPanel = 'menu';
        render();
      });

    document.querySelectorAll('.tile[data-image-index]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const i = Number(btn.dataset.imageIndex);
        if (Number.isNaN(i)) return;
        state.selectedIndex = state.selectedIndex === i ? null : i;
        render();
      });
    });

    const dismissSheet = () => {
      closeCustomizeSheet();
      render();
    };
    document
      .querySelector('#btn-customize-backdrop')
      ?.addEventListener('click', dismissSheet);
    document
      .querySelector('#btn-customize-cancel')
      ?.addEventListener('click', dismissSheet);
    document
      .querySelector('#btn-customize-upload')
      ?.addEventListener('click', () => {
        document.querySelector('#file-upload-image')?.click();
      });
    document
      .querySelector('#btn-customize-choose-emoji')
      ?.addEventListener('click', () => {
        state.customizeSheetPanel = 'emoji';
        render();
      });
    document
      .querySelector('#btn-customize-emoji-back')
      ?.addEventListener('click', () => {
        state.customizeSheetPanel = 'menu';
        render();
      });

    document
      .querySelector('#file-upload-image')
      ?.addEventListener('change', async (e) => {
        const f = e.target.files?.[0];
        e.target.value = '';
        if (!f || !f.type.startsWith('image/')) return;
        try {
          const dataUrl = await fileToResizedJpegDataUrl(f);
          state.images.unshift({
            src: dataUrl,
            placeholder: false,
            manual: true,
          });
          state.selectedIndex = 0;
          state.error = '';
          closeCustomizeSheet();
        } catch (err) {
          state.error =
            err instanceof Error
              ? err.message
              : 'Could not use this image. Try another file.';
        }
        render();
      });

    document
      .querySelectorAll('#customize-bottom-sheet [data-swatch-color]')
      .forEach((btn) => {
        btn.addEventListener('click', () => {
          const c = btn.getAttribute('data-swatch-color');
          if (c) state.customCardColor = c;
          render();
        });
      });
    document
      .querySelectorAll('#customize-bottom-sheet [data-emoji-tile]')
      .forEach((btn) => {
        btn.addEventListener('click', () => {
          const em = btn.getAttribute('data-emoji-tile');
          if (!em) return;
          const src = generateEmojiCardDataUrl(em, state.customCardColor);
          state.images.unshift({ src, placeholder: false, manual: true });
          state.selectedIndex = 0;
          state.error = '';
          closeCustomizeSheet();
          render();
        });
      });

    document
      .querySelector('#btn-close-select')
      ?.addEventListener('click', () => {
        closeCustomizeSheet();
        state.view = 'add';
        state.customCardColor = EMOJI_CARD_BACKGROUNDS[0];
        state.images = [];
        state.selectedIndex = null;
        state.error = '';
        render();
      });

    document
      .querySelector('#btn-continue-select')
      ?.addEventListener('click', () => {
        if (state.selectedIndex === null) return;
        state.selectedGroupId = null;
        state.view = 'group';
        closeCustomizeSheet();
        render();
      });
    return;
  }

  if (state.view === 'group') {
    document.querySelectorAll('.group-card[data-group-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.selectedGroupId = btn.dataset.groupId;
        render();
      });
    });

    document
      .querySelector('#btn-goto-create-group')
      ?.addEventListener('click', () => {
        state.newGroupName = '';
        state.view = 'createGroup';
        render();
      });

    document
      .querySelector('#btn-close-group')
      ?.addEventListener('click', () => {
        resetFlow();
        render();
      });

    document
      .querySelector('#btn-continue-group')
      ?.addEventListener('click', async () => {
        if (!state.selectedGroupId) return;
        await saveWishlistItem(state.selectedGroupId);
        resetFlow();
        render();
      });

    document
      .querySelector('#btn-skip-group')
      ?.addEventListener('click', async () => {
        await saveWishlistItem(null);
        resetFlow();
        render();
      });
    return;
  }

  if (state.view === 'createGroup') {
    const input = document.querySelector('#group-name-input');
    const btnSubmit = document.querySelector('#btn-submit-create-group');

    input?.addEventListener('input', (e) => {
      state.newGroupName = e.target.value;
      btnSubmit.disabled = !state.newGroupName.trim();
    });

    document
      .querySelector('#btn-back-create-group')
      ?.addEventListener('click', () => {
        state.newGroupName = '';
        state.view = 'group';
        render();
      });

    document
      .querySelector('#btn-submit-create-group')
      ?.addEventListener('click', async () => {
        const name = state.newGroupName.trim();
        if (!name) return;
        const id = await addGroup(name);
        state.newGroupName = '';
        state.selectedGroupId = id;
        state.view = 'group';
        render();
      });
  }
}

// ── Boot ─────────────────────────────────────────────────────────────────────

async function init() {
  render(); // show loading spinner
  await fetchStore();
  state.view = 'wishlist';
  render();
}

init();
