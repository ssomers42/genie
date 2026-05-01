import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useWizardStore } from "@/features/scraper/stores/wizardStore";
import { nameFromUrl, parseUrl } from "@/lib/url";

export default function AddUrlScreen() {
  const insets = useSafeAreaInsets();
  const url = useWizardStore((s) => s.url);
  const itemName = useWizardStore((s) => s.itemName);
  const setUrl = useWizardStore((s) => s.setUrl);
  const setItemName = useWizardStore((s) => s.setItemName);

  const parsed = useMemo(() => parseUrl(url), [url]);
  const canContinue = !!parsed;

  const keyboardOffset = Platform.OS === "ios" ? insets.top + 8 : 0;

  return (
    <KeyboardAvoidingView
      className="bg-bg flex-1"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={keyboardOffset}
      style={{ paddingTop: insets.top }}
    >
      <View className="flex-1">
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 16,
          }}
        >
          <View className="flex-row items-start">
            <Pressable
              onPress={() => router.back()}
              className="h-11 w-11 shrink-0 items-start justify-center"
              accessibilityLabel="Close"
              hitSlop={10}
            >
              <Ionicons name="close" size={28} color="#000000" />
            </Pressable>
            <View className="min-w-0 flex-1 items-center px-2">
              <Text
                className="font-sans-bold text-center text-lg text-foreground"
                numberOfLines={1}
              >
                Add a link
              </Text>
              <View style={{ height: 60 }} />
            </View>
            <View className="h-11 w-11 shrink-0" />
          </View>

          <Text className="font-sans-medium text-foreground">Link</Text>
          <TextInput
            className="border-border font-sans mt-2 rounded-input border bg-bg px-4 py-3 text-base text-foreground"
            placeholder="https://…"
            placeholderTextColor="#8e8e93"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            value={url}
            onChangeText={(t) => {
              setUrl(t);
              const ok = parseUrl(t);
              if (ok) {
                const n = nameFromUrl(ok.href);
                const manual = useWizardStore.getState().itemNameManuallyEdited;
                if (!manual) setItemName(n, false);
              }
            }}
          />
          {canContinue ? (
            <>
              <Text className="font-sans-medium mt-5 text-foreground">Name</Text>
              <TextInput
                className="border-border font-sans mt-2 rounded-input border bg-bg px-4 py-3 text-base text-foreground"
                placeholder="Item name"
                placeholderTextColor="#8e8e93"
                value={itemName}
                onChangeText={(t) => setItemName(t, true)}
              />
            </>
          ) : null}
        </ScrollView>

        <View
          className="bg-bg pt-3"
          style={{
            paddingHorizontal: 20,
            paddingBottom: Math.max(insets.bottom, 24),
          }}
        >
          <Pressable
            disabled={!canContinue}
            onPress={() => {
              if (!parsed) return;
              setUrl(parsed.href);
              router.push("/add/select");
            }}
            className={`rounded-input py-4 ${canContinue ? "bg-primary" : "bg-btn-secondary"}`}
          >
            <Text
              className={`text-center font-sans-semibold text-base ${canContinue ? "text-bg" : "text-muted"}`}
            >
              Continue
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
