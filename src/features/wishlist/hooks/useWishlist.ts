import { useCallback, useEffect, useState } from "react";
import {
  addGroup,
  deleteWishlistItem,
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
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === "object" &&
              e !== null &&
              "message" in e &&
              typeof (e as { message: unknown }).message === "string"
            ? (e as { message: string }).message
            : "Failed to load wishlist";
      setError(msg);
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

  const removeItem = useCallback(
    async (id: string) => {
      await deleteWishlistItem(id);
      await refresh();
    },
    [refresh],
  );

  const restoreItem = useCallback(
    async (params: {
      groupId: string | null;
      url: string;
      imageSrc: string;
      name: string | null;
      addedAt: number;
    }) => {
      await saveWishlistItem(params);
      await refresh();
    },
    [refresh],
  );

  return {
    store,
    loading,
    error,
    refresh,
    createGroup,
    saveItem,
    removeItem,
    restoreItem,
  };
}
