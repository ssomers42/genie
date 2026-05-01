import { create } from "zustand";
import type { WizardImage } from "@/types";
import { EMOJI_CARD_BACKGROUNDS } from "@/lib/emojiCard";

export type CustomizePanel = "menu" | "emoji";

type WizardState = {
  url: string;
  itemName: string;
  itemNameManuallyEdited: boolean;
  customCardColor: string;
  customizeSheetOpen: boolean;
  customizeSheetPanel: CustomizePanel;
  images: WizardImage[];
  selectedIndex: number | null;
  loading: boolean;
  error: string;
  selectedGroupId: string | null;
  newGroupName: string;
  reset: () => void;
  setUrl: (v: string) => void;
  setItemName: (v: string, manual: boolean) => void;
  setCustomCardColor: (v: string) => void;
  setCustomizeSheetOpen: (v: boolean) => void;
  setCustomizeSheetPanel: (v: CustomizePanel) => void;
  setImages: (images: WizardImage[]) => void;
  setSelectedIndex: (i: number | null) => void;
  setLoading: (v: boolean) => void;
  setError: (v: string) => void;
  setSelectedGroupId: (id: string | null) => void;
  setNewGroupName: (v: string) => void;
  prependImage: (img: WizardImage) => void;
};

const initial = () => ({
  url: "",
  itemName: "",
  itemNameManuallyEdited: false,
  customCardColor: EMOJI_CARD_BACKGROUNDS[0]!,
  customizeSheetOpen: false,
  customizeSheetPanel: "menu" as CustomizePanel,
  images: [] as WizardImage[],
  selectedIndex: null as number | null,
  loading: false,
  error: "",
  selectedGroupId: null as string | null,
  newGroupName: "",
});

export const useWizardStore = create<WizardState>((set) => ({
  ...initial(),
  reset: () => set(initial()),
  setUrl: (url) => set({ url }),
  setItemName: (itemName, itemNameManuallyEdited) =>
    set({ itemName, itemNameManuallyEdited }),
  setCustomCardColor: (customCardColor) => set({ customCardColor }),
  setCustomizeSheetOpen: (customizeSheetOpen) => set({ customizeSheetOpen }),
  setCustomizeSheetPanel: (customizeSheetPanel) => set({ customizeSheetPanel }),
  setImages: (images) => set({ images }),
  setSelectedIndex: (selectedIndex) => set({ selectedIndex }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setSelectedGroupId: (selectedGroupId) => set({ selectedGroupId }),
  setNewGroupName: (newGroupName) => set({ newGroupName }),
  prependImage: (img) =>
    set((s) => ({
      images: [img, ...s.images],
      selectedIndex: 0,
      error: "",
    })),
}));
