import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmojiCardSurface } from "@/components/EmojiCardSurface";
import { useWishlist } from "@/features/wishlist/hooks/useWishlist";
import { useListUiStore } from "@/features/wishlist/stores/listUiStore";
import { tryParseGenieEmojiCard } from "@/lib/emojiCard";
import {
  wishlistGridCardStyles,
  WISHLIST_ROW_THUMB,
} from "@/lib/wishlistImageStyles";
import {
  getAllWishlistItems,
  getWishlistItemsForFilter,
} from "@/lib/wishlistFilters";
import type { WishlistItemWithGroup } from "@/types";

function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default function WishlistScreen() {
  const insets = useSafeAreaInsets();
  const { store, loading, error } = useWishlist();
  const wishlistGroupFilter = useListUiStore((s) => s.wishlistGroupFilter);
  const setWishlistGroupFilter = useListUiStore((s) => s.setWishlistGroupFilter);
  const wishlistLayout = useListUiStore((s) => s.wishlistLayout);
  const setWishlistLayout = useListUiStore((s) => s.setWishlistLayout);

  const items = useMemo(
    () => getWishlistItemsForFilter(store, wishlistGroupFilter),
    [store, wishlistGroupFilter],
  );

  const allItems = useMemo(() => getAllWishlistItems(store), [store]);

  if (loading) {
    return (
      <View className="bg-bg w-full flex-1 items-center justify-center pb-24">
        <ActivityIndicator size="large" color="#262626" />
      </View>
    );
  }

  if (error) {
    return (
      <View
        className="bg-bg w-full flex-1 items-center justify-center px-6 pb-24"
        style={{ paddingTop: insets.top }}
      >
        <Text className="text-center text-muted">{error}</Text>
      </View>
    );
  }

  const bottomPad = Math.max(insets.bottom, 8) + 88;

  const renderItem = ({ item }: { item: WishlistItemWithGroup }) => {
    if (wishlistLayout === "grid") {
      const uri = item.imageSrc;
      const emojiCard = tryParseGenieEmojiCard(uri);
      return (
        <Pressable
          onPress={() => void Linking.openURL(item.url)}
          className="w-[50%] p-1"
        >
          <View style={wishlistGridCardStyles.wrap}>
            {emojiCard ? (
              <EmojiCardSurface
                emoji={emojiCard.emoji}
                bg={emojiCard.bg}
                emojiSize={88}
              />
            ) : (
              <Image
                source={{ uri }}
                style={wishlistGridCardStyles.imageFill}
                contentFit="cover"
              />
            )}
          </View>
        </Pressable>
      );
    }
    const rowEmoji = tryParseGenieEmojiCard(item.imageSrc);
    return (
      <Pressable
        onPress={() => void Linking.openURL(item.url)}
        className="w-full border-b border-border flex-row items-center gap-3 px-4 py-3"
      >
        {rowEmoji ? (
          <View style={[WISHLIST_ROW_THUMB, { overflow: "hidden" }]}>
            <EmojiCardSurface
              emoji={rowEmoji.emoji}
              bg={rowEmoji.bg}
              emojiSize={28}
            />
          </View>
        ) : (
          <Image
            source={{ uri: item.imageSrc }}
            style={WISHLIST_ROW_THUMB}
            contentFit="cover"
          />
        )}
        <View className="min-w-0 flex-1">
          {item.name ? (
            <Text className="font-sans-medium text-foreground" numberOfLines={2}>
              {item.name}
            </Text>
          ) : null}
          <Text
            className={`text-sm ${item.name ? "text-muted" : "text-foreground"}`}
            numberOfLines={1}
          >
            {hostFromUrl(item.url)}
          </Text>
          {item.groupName ? (
            <Text className="text-muted mt-0.5 text-xs">{item.groupName}</Text>
          ) : null}
        </View>
      </Pressable>
    );
  };

  const empty = () => {
    const hasOther =
      wishlistGroupFilter && allItems.length > 0;
    return (
      <View className="items-center px-8 py-16">
        <Text className="font-sans-semibold text-center text-lg text-foreground">
          {hasOther ? "No items in this group" : "Nothing here yet"}
        </Text>
        <Text className="text-muted mt-2 text-center">
          {hasOther
            ? "Switch tabs or tap + to add something here."
            : "Tap + to save something from a link."}
        </Text>
      </View>
    );
  };

  return (
    <View className="bg-bg w-full flex-1" style={{ paddingTop: insets.top }}>
      <View className="min-h-10 w-full flex-row items-start justify-between px-5 pb-3 pt-2">
        <Text className="font-sans-bold leading-none text-2xl text-foreground">
          My wishlist
        </Text>
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => setWishlistLayout("grid")}
            accessibilityLabel="Grid view"
            className="h-10 w-10 items-center justify-center"
            hitSlop={6}
          >
            <Ionicons
              name="grid-outline"
              size={22}
              color={wishlistLayout === "grid" ? "#000000" : "#8e8e93"}
            />
          </Pressable>
          <Pressable
            onPress={() => setWishlistLayout("list")}
            accessibilityLabel="List view"
            className="h-10 w-10 items-center justify-center"
            hitSlop={6}
          >
            <Ionicons
              name="list-outline"
              size={22}
              color={wishlistLayout === "list" ? "#000000" : "#8e8e93"}
            />
          </Pressable>
        </View>
      </View>

      {store.groups.length > 0 ? (
        <View
          className="px-3"
          style={{ height: 36, marginBottom: 6, justifyContent: "center" }}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
            contentContainerStyle={{
              gap: 8,
              alignItems: "center",
              paddingRight: 4,
            }}
          >
            <Pressable
              onPress={() => setWishlistGroupFilter(null)}
              style={{
                height: 32,
                paddingHorizontal: 16,
                justifyContent: "center",
                borderRadius: 9999,
                backgroundColor: !wishlistGroupFilter ? "#000000" : "#f2f2f7",
              }}
            >
              <Text
                className="font-sans-medium text-sm"
                style={{
                  color: !wishlistGroupFilter ? "#ffffff" : "#000000",
                }}
              >
                All items
              </Text>
            </Pressable>
            {store.groups.map((g) => {
              const on = wishlistGroupFilter === g.id;
              return (
                <Pressable
                  key={g.id}
                  onPress={() => setWishlistGroupFilter(g.id)}
                  style={{
                    height: 32,
                    paddingHorizontal: 16,
                    justifyContent: "center",
                    borderRadius: 9999,
                    backgroundColor: on ? "#000000" : "#f2f2f7",
                  }}
                >
                  <Text
                    className="font-sans-medium text-sm"
                    style={{ color: on ? "#ffffff" : "#000000" }}
                  >
                    {g.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {wishlistLayout === "grid" ? (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          numColumns={2}
          key="grid"
          columnWrapperStyle={{ paddingHorizontal: 8 }}
          contentContainerStyle={{ paddingBottom: bottomPad }}
          ListEmptyComponent={empty}
          renderItem={renderItem}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          key="list"
          contentContainerStyle={{ paddingBottom: bottomPad }}
          ListEmptyComponent={empty}
          renderItem={renderItem}
        />
      )}
    </View>
  );
}
