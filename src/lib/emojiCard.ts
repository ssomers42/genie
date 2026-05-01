export const EMOJI_CARD_BACKGROUNDS = [
  "#E8E4E1",
  "#C9DCE9",
  "#D4E5D7",
  "#E5D4E8",
  "#F3E5C8",
  "#1a1a1a",
  "#f2f2f7",
  "#2c3e50",
];

export const EMOJI_CARD_EMOJIS = [
  "🛍️",
  "👟",
  "👕",
  "👗",
  "👜",
  "🧢",
  "⌚",
  "👓",
  "💼",
  "👔",
];

export function isValidCardBg(hex: string): boolean {
  return (
    typeof hex === "string" &&
    /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/i.test(hex)
  );
}

export function generateEmojiCardDataUrl(emoji: string, bg: string): string {
  const fill = isValidCardBg(bg) ? bg : EMOJI_CARD_BACKGROUNDS[0]!;
  const safe = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 533" preserveAspectRatio="xMidYMid slice" width="100%" height="100%"><!--genie-emoji-card--><rect fill="${fill}" width="100%" height="100%"/><text x="50%" y="52%" font-size="120" text-anchor="middle" dominant-baseline="middle" font-family="system-ui,Apple Color Emoji,Segoe UI Emoji,Noto Color Emoji,sans-serif">${safe(emoji)}</text></svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
}

/** Parsed fields for native rendering (expo-image SVG data-URLs are unreliable). */
export type GenieEmojiCardPayload = { emoji: string; bg: string };

export function tryParseGenieEmojiCard(
  uri: string,
): GenieEmojiCardPayload | null {
  if (!uri.startsWith("data:image/svg+xml")) return null;
  try {
    const comma = uri.indexOf(",");
    if (comma === -1) return null;
    const raw = decodeURIComponent(uri.slice(comma + 1));
    const rectMatch = raw.match(/<rect[^>]*\bfill="([^"]+)"/);
    const textMatch = raw.match(/<text[^>]*>([^<]*)<\/text>/);
    if (!rectMatch?.[1] || textMatch?.[1] === undefined) return null;
    let emoji = textMatch[1]
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .trim();
    if (!emoji) return null;
    return { emoji, bg: rectMatch[1] };
  } catch {
    return null;
  }
}
