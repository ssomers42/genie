import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { useWishlist } from "@/features/wishlist/hooks/useWishlist";
import { useWizardStore } from "@/features/scraper/stores/wizardStore";

export default function PickGroupScreen() {
  const insets = useSafeAreaInsets();
  const { store, saveItem } = useWishlist();
  const url = useWizardStore((s) => s.url);
  const itemName = useWizardStore((s) => s.itemName);
  const images = useWizardStore((s) => s.images);
  const selectedIndex = useWizardStore((s) => s.selectedIndex);
  const setSelectedGroupId = useWizardStore((s) => s.setSelectedGroupId);
  const selectedGroupId = useWizardStore((s) => s.selectedGroupId);
  const reset = useWizardStore((s) => s.reset);

  const idx = selectedIndex ?? 0;
  const imageSrc = images[idx]?.src ?? "";

  const finish = async (groupId: string | null) => {
    await saveItem({
      groupId,
      url,
      imageSrc,
      name: itemName.trim() || null,
    });
    if (Platform.OS !== "web") {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    reset();
    router.replace("/");
  };

  return (
    <View className="bg-bg flex-1" style={{ paddingTop: insets.top }}>
      <View className="h-14 flex-row items-center px-2">
        <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center">
          <Text className="text-2xl text-foreground">‹</Text>
        </Pressable>
        <Text className="font-sans-semibold flex-1 text-center text-lg text-foreground">
          Save to group
        </Text>
        <View className="w-10" />
      </View>
      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) + 80 }}
      >
        {store.groups.map((g) => {
          const on = selectedGroupId === g.id;
          return (
            <Pressable
              key={g.id}
              onPress={() => setSelectedGroupId(g.id)}
              className={`border-border mb-3 rounded-card border p-4 ${on ? "border-ring border-2" : ""}`}
            >
              <Text className="font-sans-semibold text-foreground">{g.name}</Text>
              <Text className="text-muted text-sm">
                {g.items.length} {g.items.length === 1 ? "item" : "items"}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => router.push("/add/create-group")}
          className="border-border rounded-card border border-dashed py-4"
        >
          <Text className="text-center font-sans-medium text-ring">+ Create new group</Text>
        </Pressable>
      </ScrollView>
      <View
        className="border-border gap-3 border-t bg-bg px-4 py-3"
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
      >
        <Pressable
          onPress={() => void finish(null)}
          className="rounded-input border border-border py-4"
        >
          <Text className="text-center font-sans-semibold text-foreground">Skip — no group</Text>
        </Pressable>
        <Pressable
          disabled={!selectedGroupId}
          onPress={() => void finish(selectedGroupId)}
          className={`rounded-input py-4 ${selectedGroupId ? "bg-primary" : "bg-btn-secondary"}`}
        >
          <Text
            className={`text-center font-sans-semibold ${selectedGroupId ? "text-bg" : "text-muted"}`}
          >
            Save to wishlist
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
