import { useMemo, useRef, useState, type ReactElement } from "react";
import {
  FlatList,
  Keyboard,
  Linking,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmojiCardSurface } from "@/components/EmojiCardSurface";
import { useWishlist } from "@/features/wishlist/hooks/useWishlist";
import { tryParseGenieEmojiCard } from "@/lib/emojiCard";
import { WISHLIST_ROW_THUMB } from "@/lib/wishlistImageStyles";
import { filterItemsBySearch, getAllWishlistItems } from "@/lib/wishlistFilters";
import type { WishlistItemWithGroup } from "@/types";

function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const searchInputRef = useRef<TextInput>(null);
  const { store, loading } = useWishlist();

  const all = useMemo(() => getAllWishlistItems(store), [store]);
  const items = useMemo(() => filterItemsBySearch(all, q), [all, q]);

  const bottomPad = Math.max(insets.bottom, 8) + 88;

  const renderItem = ({ item }: { item: WishlistItemWithGroup }) => {
    const emojiCard = tryParseGenieEmojiCard(item.imageSrc);
    return (
      <Pressable
        onPress={() => void Linking.openURL(item.url)}
        className="w-full border-b border-border flex-row items-center gap-3 px-4 py-3"
      >
        {emojiCard ? (
          <View style={[WISHLIST_ROW_THUMB, { overflow: "hidden" }]}>
            <EmojiCardSurface
              emoji={emojiCard.emoji}
              bg={emojiCard.bg}
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

  let empty: ReactElement | null = null;
  if (!loading && !all.length) {
    empty = (
      <View className="items-center px-8 py-16">
        <Text className="font-sans-semibold text-center text-lg text-foreground">
          Nothing here yet
        </Text>
        <Text className="text-muted mt-2 text-center">
          Tap + to save something from a link.
        </Text>
      </View>
    );
  } else if (!loading && all.length && !items.length) {
    empty = (
      <View className="items-center px-8 py-16">
        <Text className="font-sans-semibold text-center text-lg text-foreground">
          No results
        </Text>
        <Text className="text-muted mt-2 text-center">
          Try another name, store, or group.
        </Text>
      </View>
    );
  }

  return (
    <View className="bg-bg w-full flex-1" style={{ paddingTop: insets.top }}>
      <View className="min-h-10 w-full flex-row items-start justify-between px-5 pb-3 pt-2">
        <Text className="font-sans-bold leading-none text-2xl text-foreground">Search</Text>
        {/* Matches grid + list icon cluster width (2×40 + gap) so title aligns with My wishlist */}
        <View className="h-10 w-[88px]" pointerEvents="none" accessible={false} />
      </View>
      <View className="flex-row items-center gap-2 px-5 pb-3">
        <TextInput
          ref={searchInputRef}
          className="min-w-0 flex-1 border-border font-sans rounded-input border bg-bg px-4 py-3 text-foreground"
          placeholder="Search items, stores, groups"
          placeholderTextColor="#8e8e93"
          value={q}
          onChangeText={setQ}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {searchFocused ? (
          <Pressable
            onPress={() => {
              Keyboard.dismiss();
              searchInputRef.current?.blur();
            }}
            hitSlop={8}
            accessibilityLabel="Dismiss keyboard"
          >
            <Text className="font-sans-medium text-base text-ring">Cancel</Text>
          </Pressable>
        ) : null}
      </View>
      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ paddingBottom: bottomPad, flexGrow: 1 }}
        ListEmptyComponent={empty}
        renderItem={renderItem}
      />
    </View>
  );
}
