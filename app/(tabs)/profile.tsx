import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Image } from "expo-image";
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useWishlist } from "@/features/wishlist/hooks/useWishlist";
import { useListUiStore } from "@/features/wishlist/stores/listUiStore";
import { EmojiCardSurface } from "@/components/EmojiCardSurface";
import { tryParseGenieEmojiCard } from "@/lib/emojiCard";
import { PROFILE_GRID_THUMB } from "@/lib/wishlistImageStyles";
import { profileInitials } from "@/lib/url";
import type { WishlistItem } from "@/types";

function groupItemsLabel(n: number) {
  return n === 1 ? "1 item" : `${n} items`;
}

/** Fixed 2×2 thumbnail grid (Figma: profile wishlist group rows). */
const GROUP_GRID = 72;
const GROUP_GAP = 4;
const CELL = (GROUP_GRID - GROUP_GAP) / 2;
const CELL_RADIUS = 6;

function ProfileGroupGridCell({ item }: { item: WishlistItem | null }) {
  const uri = item?.imageSrc ?? "";
  const emojiCard = uri ? tryParseGenieEmojiCard(uri) : null;
  return (
    <View
      style={{
        width: CELL,
        height: CELL,
        borderRadius: CELL_RADIUS,
        overflow: "hidden",
        backgroundColor: "#f2f2f7",
      }}
    >
      {emojiCard ? (
        <EmojiCardSurface
          emoji={emojiCard.emoji}
          bg={emojiCard.bg}
          emojiSize={Math.max(12, Math.round(CELL * 0.48))}
        />
      ) : item?.imageSrc ? (
        <Image
          source={{ uri: item.imageSrc }}
          style={PROFILE_GRID_THUMB}
          contentFit="cover"
        />
      ) : null}
    </View>
  );
}

function ProfileGroupGrid({ items }: { items: WishlistItem[] }) {
  const slots: (WishlistItem | null)[] = [
    items[0] ?? null,
    items[1] ?? null,
    items[2] ?? null,
    items[3] ?? null,
  ];
  return (
    <View style={{ width: GROUP_GRID, height: GROUP_GRID }}>
      <View style={{ flexDirection: "row", gap: GROUP_GAP }}>
        <ProfileGroupGridCell item={slots[0]} />
        <ProfileGroupGridCell item={slots[1]} />
      </View>
      <View
        style={{
          flexDirection: "row",
          gap: GROUP_GAP,
          marginTop: GROUP_GAP,
        }}
      >
        <ProfileGroupGridCell item={slots[2]} />
        <ProfileGroupGridCell item={slots[3]} />
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const setWishlistGroupFilter = useListUiStore((s) => s.setWishlistGroupFilter);
  const { store, loading } = useWishlist();
  const [displayName] = useState("Your name");
  const [handle] = useState("@yourhandle");
  const initials = profileInitials(displayName);

  const bottomPad = Math.max(insets.bottom, 8) + 88;

  return (
    <View className="bg-bg w-full flex-1" style={{ paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={{ paddingBottom: bottomPad, paddingHorizontal: 20 }}>
        <View className="items-center pt-2">
          <View className="bg-surface mb-3 h-20 w-20 items-center justify-center rounded-full">
            <Text className="font-sans-semibold text-2xl text-foreground">{initials}</Text>
          </View>
          <Text className="font-sans-bold text-2xl text-foreground">{displayName}</Text>
          <Text className="text-muted mt-1">{handle}</Text>
        </View>
        <Text className="font-sans-semibold mt-8 text-lg text-foreground">Wishlist</Text>
        {!loading && !store.groups.length ? (
          <Text className="text-muted mt-4">
            No groups yet — add items and organize them into groups.
          </Text>
        ) : (
          <View className="mt-4 gap-3">
            {store.groups.map((g) => {
              const n = g.items?.length ?? 0;
              const items = g.items || [];
              const openGroup = () => {
                setWishlistGroupFilter(g.id);
                router.navigate("/");
              };
              return (
                <Pressable
                  key={g.id}
                  onPress={openGroup}
                  className="border-border flex-row items-center gap-3 rounded-card border bg-bg p-3"
                >
                  <ProfileGroupGrid items={items} />
                  <View className="min-w-0 flex-1 justify-center">
                    <Text className="font-sans-semibold text-foreground">{g.name}</Text>
                    <Text className="text-muted mt-0.5 text-sm">{groupItemsLabel(n)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#aeaeb2" />
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
