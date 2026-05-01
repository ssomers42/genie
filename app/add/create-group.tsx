import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useWishlist } from "@/features/wishlist/hooks/useWishlist";
import { useWizardStore } from "@/features/scraper/stores/wizardStore";

export default function CreateGroupScreen() {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const { createGroup } = useWishlist();
  const setSelectedGroupId = useWizardStore((s) => s.setSelectedGroupId);
  const trimmed = name.trim();
  const canCreate = trimmed.length > 0;

  const disabledStyle = useMemo(
    () => (!canCreate ? "bg-btn-secondary" : "bg-primary"),
    [canCreate],
  );

  return (
    <KeyboardAvoidingView
      className="bg-bg flex-1"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ paddingTop: insets.top }}
    >
      <View className="h-14 flex-row items-center px-2">
        <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center">
          <Text className="text-2xl text-foreground">‹</Text>
        </Pressable>
        <Text className="font-sans-semibold flex-1 text-center text-lg text-foreground">
          New group
        </Text>
        <View className="w-10" />
      </View>
      <View className="flex-1 px-5 pt-4">
        <Text className="font-sans-medium text-foreground">Group name</Text>
        <TextInput
          className="border-border font-sans mt-2 rounded-input border px-4 py-3 text-foreground"
          placeholder="e.g. Holiday gifts"
          placeholderTextColor="#8e8e93"
          value={name}
          onChangeText={setName}
        />
        <Pressable
          disabled={!canCreate}
          onPress={async () => {
            const id = await createGroup(trimmed);
            setSelectedGroupId(id);
            router.back();
          }}
          className={`mt-auto rounded-input py-4 ${disabledStyle}`}
        >
          <Text
            className={`text-center font-sans-semibold ${canCreate ? "text-bg" : "text-muted"}`}
          >
            Create group
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
