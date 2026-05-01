import { StyleSheet } from "react-native";
import type { ImageStyle } from "react-native";

/** expo-image does not reliably apply NativeWind layout classes; use explicit styles. */
export const WISHLIST_ROW_THUMB: ImageStyle = {
  width: 56,
  height: 56,
  borderRadius: 10,
  backgroundColor: "#f2f2f7",
};

/** Gray rounded shell for grid tiles; image layers with absolute fill inside. */
export const wishlistGridCardStyles = StyleSheet.create({
  wrap: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#f2f2f7",
  },
  imageFill: {
    ...StyleSheet.absoluteFillObject,
  },
});

export const PROFILE_GRID_THUMB: ImageStyle = {
  width: "100%",
  height: "100%",
};
