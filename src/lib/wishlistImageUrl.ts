/**
 * Wishlist `image_src` values are persisted as returned from preview / uploads.
 *
 * iOS release builds use App Transport Security with NSAllowsArbitraryLoads=false
 * (see ios/Genie/Info.plist), so remote **http://** URLs load blank in TestFlight
 * while they may appear to work in Expo Go (different native shell / networking).
 *
 * Many retailers still emit http or protocol-relative image URLs in HTML.
 * Normalizing to https keeps ATS happy when the host supports TLS (almost all CDNs).
 */
export function normalizeWishlistImageSrc(uri: string): string {
  const u = uri.trim();
  if (!u) return u;
  if (
    u.startsWith("data:") ||
    u.startsWith("file:") ||
    u.startsWith("content:") ||
    u.startsWith("asset:")
  ) {
    return u;
  }
  if (u.startsWith("//")) {
    return `https:${u}`;
  }
  if (u.startsWith("http://")) {
    return `https://${u.slice("http://".length)}`;
  }
  return u;
}
