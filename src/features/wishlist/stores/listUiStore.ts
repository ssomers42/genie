import { create } from "zustand";

type ListUi = {
  wishlistGroupFilter: string | null;
  wishlistLayout: "grid" | "list";
  setWishlistGroupFilter: (id: string | null) => void;
  setWishlistLayout: (layout: "grid" | "list") => void;
};

export const useListUiStore = create<ListUi>((set) => ({
  wishlistGroupFilter: null,
  wishlistLayout: "grid",
  setWishlistGroupFilter: (wishlistGroupFilter) => set({ wishlistGroupFilter }),
  setWishlistLayout: (wishlistLayout) => set({ wishlistLayout }),
}));
