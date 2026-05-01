import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextStyle,
  useWindowDimensions,
  View,
} from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useProductScraper } from "@/features/scraper/hooks/useProductScraper";
import { useWizardStore } from "@/features/scraper/stores/wizardStore";
import {
  EMOJI_CARD_BACKGROUNDS,
  EMOJI_CARD_EMOJIS,
  generateEmojiCardDataUrl,
  tryParseGenieEmojiCard,
} from "@/lib/emojiCard";
import {
  wishlistGridCardStyles,
} from "@/lib/wishlistImageStyles";
import { EmojiCardSurface } from "@/components/EmojiCardSurface";
import { pickImageAsJpegDataUrl } from "@/lib/pickImage";

/** Avoid bundled sans fonts for emoji glyphs (Public Sans has no color emoji). */
const EMOJI_CHAR_STYLE = Platform.select<TextStyle>({
  ios: { fontSize: 34, lineHeight: 42 },
  android: {
    fontSize: 32,
    lineHeight: 40,
    fontFamily: "sans-serif",
    includeFontPadding: false,
  },
  default: { fontSize: 32, lineHeight: 40 },
});

export default function SelectImagesScreen() {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const url = useWizardStore((s) => s.url);
  const { loadPreview } = useProductScraper();
  const loading = useWizardStore((s) => s.loading);
  const error = useWizardStore((s) => s.error);
  const images = useWizardStore((s) => s.images);
  const selectedIndex = useWizardStore((s) => s.selectedIndex);
  const setSelectedIndex = useWizardStore((s) => s.setSelectedIndex);
  const customizeSheetOpen = useWizardStore((s) => s.customizeSheetOpen);
  const setCustomizeSheetOpen = useWizardStore((s) => s.setCustomizeSheetOpen);
  const customizeSheetPanel = useWizardStore((s) => s.customizeSheetPanel);
  const setCustomizeSheetPanel = useWizardStore((s) => s.setCustomizeSheetPanel);
  const customCardColor = useWizardStore((s) => s.customCardColor);
  const setCustomCardColor = useWizardStore((s) => s.setCustomCardColor);
  const setError = useWizardStore((s) => s.setError);
  const prependImage = useWizardStore((s) => s.prependImage);
  const hasImages = images.length > 0;

  const sidePad = 12;
  const gridGap = 8;
  const cellW = Math.max(
    140,
    (windowWidth - sidePad * 2 - gridGap) / 2,
  );

  useEffect(() => {
    if (url) void loadPreview(url);
  }, [url, loadPreview]);

  const closeSheet = () => {
    setCustomizeSheetOpen(false);
    setCustomizeSheetPanel("menu");
  };

  return (
    <View className="bg-bg w-full flex-1" style={{ paddingTop: insets.top }}>
      <View className="h-14 w-full flex-row items-center px-2">
        <Pressable
          onPress={() => {
            closeSheet();
            router.back();
          }}
          className="h-10 w-10 items-center justify-center"
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={26} color="#000000" />
        </Pressable>
        <Text className="font-sans-semibold flex-1 text-center text-lg text-foreground">
          Pick an image
        </Text>
        <View className="w-10" />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center py-20">
          <ActivityIndicator size="large" color="#262626" />
        </View>
      ) : null}

      {!loading && error ? (
        <Text className="text-muted px-4 py-2 text-center text-sm">{error}</Text>
      ) : null}

      <FlatList
        data={images}
        keyExtractor={(_, i) => String(i)}
        numColumns={2}
        key="image-grid"
        columnWrapperStyle={{
          gap: gridGap,
          paddingHorizontal: sidePad,
          justifyContent: "space-between",
        }}
        contentContainerStyle={{ paddingBottom: 120, paddingTop: 8 }}
        ListEmptyComponent={
          !loading ? (
            <View className="px-4 py-10">
              <Text className="text-center font-sans-semibold text-base text-foreground">
                No preview images yet
              </Text>
              <Text className="text-muted mt-2 text-center text-sm">
                This can happen if the product page blocks scraping. Use
                Customize to upload your own photo or pick an emoji card.
              </Text>
              <Pressable
                onPress={() => {
                  setCustomizeSheetOpen(true);
                  setCustomizeSheetPanel("menu");
                }}
                className="mt-5 self-center rounded-input bg-primary px-5 py-3"
              >
                <Text className="font-sans-semibold text-bg">Customize</Text>
              </Pressable>
            </View>
          ) : null
        }
        renderItem={({ item, index }) => {
          const selected = selectedIndex === index;
          const emojiCard = tryParseGenieEmojiCard(item.src);
          return (
            <Pressable
              onPress={() =>
                setSelectedIndex(selected ? null : index)
              }
              style={{ width: cellW, marginBottom: 12 }}
            >
              <View className={`overflow-hidden rounded-card bg-surface ${selected ? "border-[3px] border-ring" : "border border-transparent"}`}>
                <View style={wishlistGridCardStyles.wrap}>
                  {emojiCard ? (
                    <EmojiCardSurface
                      emoji={emojiCard.emoji}
                      bg={emojiCard.bg}
                      emojiSize={Math.min(112, Math.round(cellW * 0.42))}
                    />
                  ) : (
                    <Image
                      source={{ uri: item.src }}
                      style={wishlistGridCardStyles.imageFill}
                      contentFit="cover"
                    />
                  )}
                </View>
              </View>
              {index === 0 ? (
                <Pressable
                  onPress={() => {
                    setCustomizeSheetOpen(true);
                    setCustomizeSheetPanel("menu");
                  }}
                  className="absolute right-2 top-2 rounded-full px-3 py-1.5"
                  style={{ backgroundColor: "rgba(38,38,38,0.92)" }}
                >
                  <Text className="font-sans-medium text-xs text-white">
                    Customize
                  </Text>
                </Pressable>
              ) : null}
            </Pressable>
          );
        }}
      />

      <View
        className="border-border absolute left-0 right-0 border-t bg-bg px-4 py-3"
        style={{ bottom: 0, paddingBottom: Math.max(insets.bottom, 12) }}
      >
        <Pressable
          disabled={selectedIndex === null || !hasImages}
          onPress={() => {
            useWizardStore.getState().setSelectedGroupId(null);
            router.push("/add/group");
          }}
          className={`rounded-input py-4 ${selectedIndex === null || !hasImages ? "bg-btn-secondary" : "bg-primary"}`}
        >
          <Text
            className={`text-center font-sans-semibold ${selectedIndex === null || !hasImages ? "text-muted" : "text-bg"}`}
          >
            Continue
          </Text>
        </Pressable>
      </View>

      <Modal
        visible={customizeSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={closeSheet}
      >
        <Pressable
          className="flex-1 justify-end bg-black/40"
          onPress={closeSheet}
        >
          <Pressable
            className="bg-bg max-h-[85%] rounded-t-3xl px-4 pb-8 pt-4"
            onPress={(e) => e.stopPropagation()}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <View className="mb-4 h-1 w-10 self-center rounded-full bg-border" />
              {customizeSheetPanel === "menu" ? (
                <>
                  <Text className="font-sans-bold text-lg text-foreground">
                    Customize card
                  </Text>
                  <Pressable
                    className="border-border mt-4 rounded-input border py-4"
                    onPress={async () => {
                      try {
                        const dataUrl = await pickImageAsJpegDataUrl();
                        prependImage({
                          src: dataUrl,
                          placeholder: false,
                          manual: true,
                        });
                        closeSheet();
                      } catch (e) {
                        setError(
                          e instanceof Error ? e.message : "Could not use image",
                        );
                      }
                    }}
                  >
                    <Text className="text-center font-sans-medium text-foreground">
                      Upload photo
                    </Text>
                  </Pressable>
                  <Pressable
                    className="border-border mt-3 rounded-input border py-4"
                    onPress={() => setCustomizeSheetPanel("emoji")}
                  >
                    <Text className="text-center font-sans-medium text-foreground">
                      Choose emoji
                    </Text>
                  </Pressable>
                  <Pressable className="mt-4 py-3" onPress={closeSheet}>
                    <Text className="text-center text-ring">Cancel</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Pressable
                    onPress={() => setCustomizeSheetPanel("menu")}
                    className="mb-2 flex-row items-center gap-1 self-start py-2"
                  >
                    <Ionicons name="chevron-back" size={20} color="#007aff" />
                    <Text className="font-sans-medium text-ring">Back</Text>
                  </Pressable>
                  <Text className="font-sans-bold text-lg text-foreground">
                    Background
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="mt-2 py-2"
                  >
                    <View className="flex-row gap-2">
                      {EMOJI_CARD_BACKGROUNDS.map((c) => (
                        <Pressable
                          key={c}
                          onPress={() => setCustomCardColor(c)}
                          className={`h-11 w-11 rounded-full border-2 ${customCardColor === c ? "border-ring" : "border-transparent"}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </View>
                  </ScrollView>
                  <Text className="font-sans-bold mt-4 text-lg text-foreground">
                    Emoji
                  </Text>
                  <View className="mt-3 w-full flex-row flex-wrap justify-between">
                    {EMOJI_CARD_EMOJIS.map((em) => (
                      <Pressable
                        key={em}
                        onPress={() => {
                          const src = generateEmojiCardDataUrl(
                            em,
                            customCardColor,
                          );
                          prependImage({
                            src,
                            placeholder: false,
                            manual: true,
                          });
                          closeSheet();
                        }}
                        style={{ width: "22%" }}
                        className="mb-2 min-h-[60px] items-center justify-center rounded-input bg-surface py-2"
                      >
                        <Text
                          allowFontScaling={false}
                          style={EMOJI_CHAR_STYLE}
                        >
                          {em}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
