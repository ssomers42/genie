import { useCallback, useEffect, useState } from "react";
import {
  addGroup,
  fetchWishlistStore,
  saveWishlistItem,
} from "@/services/wishlistApi";
import type { WishlistStore } from "@/types";

export function useWishlist() {
  const [store, setStore] = useState<WishlistStore>({
    groups: [],
    ungrouped: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const next = await fetchWishlistStore();
      setStore(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load wishlist");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createGroup = useCallback(async (name: string) => {
    const id = await addGroup(name);
    await refresh();
    return id;
  }, [refresh]);

  const saveItem = useCallback(
    async (params: {
      groupId: string | null;
      url: string;
      imageSrc: string;
      name: string | null;
    }) => {
      await saveWishlistItem(params);
      await refresh();
    },
    [refresh],
  );

  return { store, loading, error, refresh, createGroup, saveItem };
}
