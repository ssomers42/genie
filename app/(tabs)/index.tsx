import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Dimensions,
  findNodeHandle,
  FlatList,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmojiCardSurface } from "@/components/EmojiCardSurface";
import { WishlistSwipeRow } from "@/features/wishlist/components/WishlistSwipeRow";
import { useWishlist } from "@/features/wishlist/hooks/useWishlist";
import { useListUiStore } from "@/features/wishlist/stores/listUiStore";
import { tryParseGenieEmojiCard } from "@/lib/emojiCard";
import {
  wishlistGridCardStyles,
} from "@/lib/wishlistImageStyles";
import {
  getAllWishlistItems,
  getWishlistItemsForFilter,
} from "@/lib/wishlistFilters";
import type { WishlistItemWithGroup } from "@/types";

type WishlistUndoSnapshot = {
  groupId: string | null;
  url: string;
  imageSrc: string;
  name: string | null;
  addedAt: number;
};

function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function isLikelyIPadLayout(): boolean {
  const { width, height } = Dimensions.get("window");
  return Math.min(width, height) >= 768;
}

function WishlistGridTile({
  item,
  onOpenRemoveMenu,
}: {
  item: WishlistItemWithGroup;
  onOpenRemoveMenu: (item: WishlistItemWithGroup, anchor?: number) => void;
}) {
  const anchorRef = useRef<View>(null);
  const uri = item.imageSrc;
  const emojiCard = tryParseGenieEmojiCard(uri);
  return (
    <Pressable
      onPress={() => void Linking.openURL(item.url)}
      onLongPress={() => {
        let anchor: number | undefined;
        if (
          Platform.OS === "ios" &&
          isLikelyIPadLayout() &&
          anchorRef.current
        ) {
          const tag = findNodeHandle(anchorRef.current);
          if (typeof tag === "number") anchor = tag;
        }
        onOpenRemoveMenu(item, anchor);
      }}
      delayLongPress={420}
      accessibilityHint="Opens link. Long press to remove from wishlist."
      className="w-[50%] p-1"
    >
      <View ref={anchorRef} collapsable={false} style={wishlistGridCardStyles.wrap}>
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

export default function WishlistScreen() {
  const insets = useSafeAreaInsets();
  const { store, loading, error, removeItem, restoreItem } = useWishlist();
  const [undoSnack, setUndoSnack] = useState<WishlistUndoSnapshot | null>(null);
  const snackHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSnackTimer = useCallback(() => {
    if (snackHideTimer.current !== null) {
      clearTimeout(snackHideTimer.current);
      snackHideTimer.current = null;
    }
  }, []);

  useEffect(() => () => clearSnackTimer(), [clearSnackTimer]);

  const scheduleHideSnack = useCallback(() => {
    clearSnackTimer();
    snackHideTimer.current = setTimeout(() => setUndoSnack(null), 5200);
  }, [clearSnackTimer]);

  const handleListItemRemoved = useCallback(
    async (item: WishlistItemWithGroup) => {
      const snapshot: WishlistUndoSnapshot = {
        groupId: item.groupId,
        url: item.url,
        imageSrc: item.imageSrc,
        name: item.name,
        addedAt: item.addedAt,
      };
      try {
        await removeItem(item.id);
        setUndoSnack(snapshot);
        scheduleHideSnack();
      } catch (e) {
        Alert.alert(
          "Couldn't remove",
          e instanceof Error ? e.message : "Please try again.",
        );
      }
    },
    [removeItem, scheduleHideSnack],
  );

  const handleUndoRemove = useCallback(async () => {
    if (!undoSnack) return;
    clearSnackTimer();
    const snap = undoSnack;
    try {
      await restoreItem(snap);
      setUndoSnack(null);
    } catch (e) {
      Alert.alert(
        "Couldn't undo",
        e instanceof Error ? e.message : "Please try again.",
      );
      scheduleHideSnack();
    }
  }, [undoSnack, restoreItem, clearSnackTimer, scheduleHideSnack]);

  const openGridItemMenu = useCallback(
    (item: WishlistItemWithGroup, anchor?: number) => {
      const title = item.name?.trim() || hostFromUrl(item.url);
      if (Platform.OS === "ios") {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            title,
            options: ["Cancel", "Remove from wishlist"],
            cancelButtonIndex: 0,
            destructiveButtonIndex: 1,
            ...(typeof anchor === "number" ? { anchor } : {}),
          },
          (i) => {
            if (i === 1) void handleListItemRemoved(item);
          },
        );
        return;
      }
      Alert.alert(title, undefined, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove from wishlist",
          style: "destructive",
          onPress: () => void handleListItemRemoved(item),
        },
      ]);
    },
    [handleListItemRemoved],
  );

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
      return (
        <WishlistGridTile item={item} onOpenRemoveMenu={openGridItemMenu} />
      );
    }
    return (
      <WishlistSwipeRow
        item={item}
        hostLabel={hostFromUrl(item.url)}
        onDelete={handleListItemRemoved}
      />
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
        <Pressable
          onPress={() =>
            setWishlistLayout(wishlistLayout === "grid" ? "list" : "grid")
          }
          accessibilityLabel={
            wishlistLayout === "grid" ? "Switch to list view" : "Switch to grid view"
          }
          className="h-10 w-10 items-center justify-center"
          hitSlop={6}
        >
          <Ionicons
            name={wishlistLayout === "grid" ? "list-outline" : "grid-outline"}
            size={22}
            color="#000000"
          />
        </Pressable>
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

      {undoSnack !== null ? (
        <View
          pointerEvents="box-none"
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            bottom: Math.max(insets.bottom, 8) + 72,
          }}
          className="flex-row items-center rounded-xl bg-foreground px-4 py-3.5 shadow-lg"
        >
          <Text className="font-sans-medium flex-1 pr-3 text-base text-bg">
            Removed from wishlist
          </Text>
          <Pressable onPress={() => void handleUndoRemove()} hitSlop={10}>
            <Text className="font-sans-bold text-base text-bg">Undo</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
