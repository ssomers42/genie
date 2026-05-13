import { useCallback } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { EmojiCardSurface } from "@/components/EmojiCardSurface";
import { tryParseGenieEmojiCard } from "@/lib/emojiCard";
import { WISHLIST_ROW_THUMB } from "@/lib/wishlistImageStyles";
import type { WishlistItemWithGroup } from "@/types";

const DELETE_WIDTH = 96;
/** Drag past reveal by this much (px) to remove without tapping Delete. */
const FULL_SWIPE_EXTRA = 72;
const DELETE_COMMIT = DELETE_WIDTH + FULL_SWIPE_EXTRA;

const springOpen = { damping: 28, stiffness: 280 };
const springClose = { damping: 32, stiffness: 320 };

type Props = {
  item: WishlistItemWithGroup;
  hostLabel: string;
  onDelete: (item: WishlistItemWithGroup) => void;
};

export function WishlistSwipeRow({ item, hostLabel, onDelete }: Props) {
  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);

  const triggerDelete = useCallback(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onDelete(item);
  }, [item, onDelete]);

  const pan = Gesture.Pan()
    .activeOffsetX([-14, 14])
    .failOffsetY([-12, 12])
    .onStart(() => {
      startX.value = translateX.value;
    })
    .onUpdate((e) => {
      const next = startX.value + e.translationX;
      translateX.value = Math.min(0, Math.max(-DELETE_COMMIT - 48, next));
    })
    .onEnd((e) => {
      const x = translateX.value;
      const fastSwipe = e.velocityX < -1200 && x < -55;
      if (x < -DELETE_COMMIT || fastSwipe) {
        translateX.value = 0;
        runOnJS(triggerDelete)();
        return;
      }
      if (x < -DELETE_WIDTH * 0.35) {
        translateX.value = withSpring(-DELETE_WIDTH, springOpen);
      } else {
        translateX.value = withSpring(0, springClose);
      }
    });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const rowEmoji = tryParseGenieEmojiCard(item.imageSrc);

  return (
    <View className="relative w-full overflow-hidden border-b border-border">
      <View style={styles.deleteUnderlay} pointerEvents="box-none">
        <Pressable
          style={styles.deletePressable}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onDelete(item);
          }}
          accessibilityLabel="Delete wishlist item"
          accessibilityRole="button"
        >
          <Text style={styles.deleteLabel}>Delete</Text>
        </Pressable>
      </View>
      <GestureDetector gesture={pan}>
        <Animated.View style={rowStyle}>
          <Pressable
            onPress={() => void Linking.openURL(item.url)}
            className="w-full flex-row items-center gap-3 bg-bg px-4 py-3"
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
                <Text
                  className="font-sans-medium text-foreground"
                  numberOfLines={2}
                >
                  {item.name}
                </Text>
              ) : null}
              <Text
                className={`text-sm ${item.name ? "text-muted" : "text-foreground"}`}
                numberOfLines={1}
              >
                {hostLabel}
              </Text>
              {item.groupName ? (
                <Text className="text-muted mt-0.5 text-xs">{item.groupName}</Text>
              ) : null}
            </View>
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  deleteUnderlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "stretch",
  },
  deletePressable: {
    width: DELETE_WIDTH,
    backgroundColor: "#dc2626",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteLabel: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 15,
  },
});
