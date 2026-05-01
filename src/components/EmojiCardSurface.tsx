import {
  Platform,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

/**
 * Renders the emoji “product card” without expo-image — SVG data-URLs
 * often draw in a corner with native image views.
 */
export function EmojiCardSurface({
  emoji,
  bg,
  emojiSize,
  style,
}: {
  emoji: string;
  bg: string;
  emojiSize: number;
  style?: StyleProp<ViewStyle>;
}) {
  const textStyle = Platform.select({
    ios: {
      fontSize: emojiSize,
      lineHeight: emojiSize + 8,
    },
    android: {
      fontSize: emojiSize,
      lineHeight: emojiSize + 8,
      fontFamily: "sans-serif",
      includeFontPadding: false,
    },
    default: {
      fontSize: emojiSize,
      lineHeight: emojiSize + 8,
    },
  });
  return (
    <View
      style={[
        StyleSheet.absoluteFillObject,
        {
          backgroundColor: bg,
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      <Text allowFontScaling={false} style={textStyle}>
        {emoji}
      </Text>
    </View>
  );
}
