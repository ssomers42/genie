export type WishlistItem = {
  id: string;
  url: string;
  imageSrc: string;
  name: string | null;
  addedAt: number;
};

export type WishlistItemWithGroup = WishlistItem & {
  groupName: string | null;
  groupId: string | null;
};

export type WishlistGroup = {
  id: string;
  name: string;
  items: WishlistItem[];
};

export type WishlistStore = {
  groups: WishlistGroup[];
  ungrouped: WishlistItem[];
};

export type ProductPreview = {
  title: string | null;
  images: string[];
  meta?: { blocked?: boolean; status?: number };
};

export type WizardImage = {
  src: string;
  placeholder: boolean;
  manual?: boolean;
};
