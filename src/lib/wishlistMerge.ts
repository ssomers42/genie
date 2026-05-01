import type { WishlistGroup, WishlistItem, WishlistStore } from "@/types";

export function toItem(row: {
  id: string;
  url: string;
  image_src: string;
  name: string | null;
  added_at: number;
}): WishlistItem {
  return {
    id: row.id,
    url: row.url,
    imageSrc: row.image_src,
    name: row.name,
    addedAt: row.added_at,
  };
}

export function buildStoreFromRows(
  groups: { id: string; name: string; created_at?: string }[],
  items: {
    id: string;
    url: string;
    image_src: string;
    name: string | null;
    added_at: number;
    group_id: string | null;
  }[],
): WishlistStore {
  const mappedGroups: WishlistGroup[] = (groups || []).map((g) => ({
    id: g.id,
    name: g.name,
    items: (items || [])
      .filter((i) => i.group_id === g.id)
      .map(toItem),
  }));
  const ungrouped = (items || [])
    .filter((i) => !i.group_id)
    .map(toItem);
  return { groups: mappedGroups, ungrouped };
}
