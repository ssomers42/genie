import { supabase } from "@/services/supabase";
import { buildStoreFromRows } from "@/lib/wishlistMerge";
import type { WishlistStore } from "@/types";

export async function fetchWishlistStore(): Promise<WishlistStore> {
  const [{ data: groups, error: ge }, { data: items, error: ie }] =
    await Promise.all([
      supabase.from("groups").select("*").order("created_at"),
      supabase.from("items").select("*").order("added_at"),
    ]);
  if (ge) throw ge;
  if (ie) throw ie;
  return buildStoreFromRows(groups ?? [], items ?? []);
}

export async function addGroup(name: string): Promise<string> {
  const { data, error } = await supabase
    .from("groups")
    .insert({ name: name.trim() })
    .select()
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function saveWishlistItem(params: {
  groupId: string | null;
  url: string;
  imageSrc: string;
  name: string | null;
}): Promise<void> {
  const { error } = await supabase.from("items").insert({
    group_id: params.groupId,
    url: params.url,
    image_src: params.imageSrc,
    name: params.name?.trim() || null,
    added_at: Date.now(),
  });
  if (error) throw error;
}
