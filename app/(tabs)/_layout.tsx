import { Ionicons } from "@expo/vector-icons";
import { Tabs, router, usePathname } from "expo-router";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useWizardStore } from "@/features/scraper/stores/wizardStore";

const ICON = 24;
const FAB_ICON = 30;
const MUTED = "#8e8e93";
const ACTIVE = "#000000";

function DockTabBar() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const onWishlist =
    pathname === "/" ||
    pathname === "/(tabs)" ||
    pathname.endsWith("/index") ||
    (!pathname.includes("search") && !pathname.includes("profile"));
  const onSearch = pathname.includes("search");
  const onProfile = pathname.includes("profile");

  return (
    <View
      className="absolute left-0 right-0 flex-row items-center justify-center px-4"
      style={{ bottom: Math.max(insets.bottom, 8) + 8 }}
      pointerEvents="box-none"
    >
      <View className="bg-surface flex-row items-center rounded-full px-2 py-2 shadow-sm">
        <Pressable
          accessibilityRole="button"
          onPress={() => router.navigate("/")}
          className="h-12 w-14 items-center justify-center"
          hitSlop={8}
        >
          <Ionicons
            name={onWishlist ? "heart" : "heart-outline"}
            size={ICON}
            color={onWishlist ? ACTIVE : MUTED}
          />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.navigate("/search")}
          className="h-12 w-14 items-center justify-center"
          hitSlop={8}
        >
          <Ionicons
            name={onSearch ? "search" : "search-outline"}
            size={ICON}
            color={onSearch ? ACTIVE : MUTED}
          />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.navigate("/profile")}
          className="h-12 w-14 items-center justify-center"
          hitSlop={8}
        >
          <Ionicons
            name={onProfile ? "person" : "person-outline"}
            size={ICON}
            color={onProfile ? ACTIVE : MUTED}
          />
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add item from link"
        onPress={() => {
          useWizardStore.getState().reset();
          router.push("/add");
        }}
        className="bg-primary ml-3 h-14 w-14 items-center justify-center rounded-full shadow-md"
        hitSlop={6}
      >
        <Ionicons name="add" size={FAB_ICON} color="#ffffff" />
      </Pressable>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: "absolute",
          height: 0,
          opacity: 0,
          borderTopWidth: 0,
        },
      }}
      tabBar={() => <DockTabBar />}
    >
      <Tabs.Screen name="index" options={{ title: "Wishlist" }} />
      <Tabs.Screen name="search" options={{ title: "Search" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
