import type { WishlistItemWithGroup, WishlistStore } from "@/types";

export function getAllWishlistItems(store: WishlistStore): WishlistItemWithGroup[] {
  const items: WishlistItemWithGroup[] = [];
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

export function filterItemsBySearch(
  items: WishlistItemWithGroup[],
  q: string,
): WishlistItemWithGroup[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return items;
  return items.filter((it) => {
    const name = (it.name || "").toLowerCase();
    let host = "";
    try {
      host = new URL(it.url).hostname.replace(/^www\./, "").toLowerCase();
    } catch {
      host = String(it.url).toLowerCase();
    }
    const group = (it.groupName || "").toLowerCase();
    return (
      name.includes(needle) || host.includes(needle) || group.includes(needle)
    );
  });
}

export function getWishlistItemsForFilter(
  store: WishlistStore,
  groupFilter: string | null,
): WishlistItemWithGroup[] {
  const all = getAllWishlistItems(store);
  if (!groupFilter) return all;
  return all.filter((it) => it.groupId === groupFilter);
}
