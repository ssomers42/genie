import { normalizeWishlistImageSrc } from "@/lib/wishlistImageUrl";
import { buildStoreFromRows } from "@/lib/wishlistMerge";
import { supabase } from "@/services/supabase";
import type { WishlistStore } from "@/types";

/** PostgREST errors are plain objects; normalize so callers get real messages in UI. */
function asQueryError(err: unknown): Error {
  if (err instanceof Error) {
    if (
      err instanceof TypeError &&
      /network request failed/i.test(String(err.message))
    ) {
      return new Error(
        `${err.message} — Cannot reach Supabase. Check Wi-Fi/VPN, that EXPO_PUBLIC_SUPABASE_URL in .env.local is https://YOUR_REF.supabase.co (no typos), restart Expo after editing env, and that the project is not paused in the Supabase dashboard.`,
      );
    }
    return err;
  }
  if (err && typeof err === "object") {
    const o = err as {
      message?: string;
      name?: string;
      code?: string;
      details?: string;
      hint?: string;
    };
    if (
      typeof o.message === "string" &&
      /network request failed/i.test(o.message)
    ) {
      return new Error(
        `${o.message} — Cannot reach Supabase. Check Wi-Fi/VPN, EXPO_PUBLIC_SUPABASE_URL in .env.local, restart Expo after env changes, and Supabase project status.`,
      );
    }
    const parts = [o.message, o.code, o.details, o.hint].filter(
      (s): s is string => typeof s === "string" && s.length > 0,
    );
    if (parts.length) return new Error(parts.join(" — "));
  }
  return new Error("Supabase request failed");
}

export async function fetchWishlistStore(): Promise<WishlistStore> {
  const [{ data: groups, error: ge }, { data: items, error: ie }] =
    await Promise.all([
      supabase.from("groups").select("*").order("created_at"),
      supabase.from("items").select("*").order("added_at"),
    ]);
  if (ge) throw asQueryError(ge);
  if (ie) throw asQueryError(ie);
  return buildStoreFromRows(groups ?? [], items ?? []);
}

export async function addGroup(name: string): Promise<string> {
  const { data, error } = await supabase
    .from("groups")
    .insert({ name: name.trim() })
    .select()
    .single();
  if (error) throw asQueryError(error);
  return data.id as string;
}

export async function saveWishlistItem(params: {
  groupId: string | null;
  url: string;
  imageSrc: string;
  name: string | null;
  /** When restoring after undo, preserve original ordering timestamp. */
  addedAt?: number;
}): Promise<void> {
  const { error } = await supabase.from("items").insert({
    group_id: params.groupId,
    url: params.url,
    image_src: normalizeWishlistImageSrc(params.imageSrc),
    name: params.name?.trim() || null,
    added_at: params.addedAt ?? Date.now(),
  });
  if (error) throw asQueryError(error);
}

export async function deleteWishlistItem(id: string): Promise<void> {
  const { error } = await supabase.from("items").delete().eq("id", id);
  if (error) throw asQueryError(error);
}
