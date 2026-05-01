export function parseUrl(input: string): URL | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const withProto =
      trimmed.startsWith("http://") || trimmed.startsWith("https://")
        ? trimmed
        : `https://${trimmed}`;
    return new URL(withProto);
  } catch {
    return null;
  }
}

export function nameFromUrl(urlString: string): string {
  try {
    const u = new URL(urlString);
    const segments = u.pathname.split("/").filter(Boolean);
    if (!segments.length) return "";
    const last = segments[segments.length - 1] ?? "";
    const clean = last.replace(/\.[^.]+$/, "");
    const spaced = clean.replace(/[-_]+/g, " ").trim();
    if (!spaced) return "";
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
  } catch {
    return "";
  }
}

export function cleanProductTitle(raw: string): string {
  if (!raw) return "";
  let s = raw.replace(/\s+/g, " ").trim();
  if (s.includes(" | ")) s = s.split(" | ")[0]?.trim() ?? "";
  else if (s.includes(" – ")) s = s.split(" – ")[0]?.trim() ?? "";
  if (s.length > 120) s = s.slice(0, 119) + "…";
  return s;
}

export function profileInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]!.charAt(0) + parts[1]!.charAt(0)).toUpperCase();
  }
  if (parts.length === 1 && parts[0]!.length >= 2) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  return parts[0]?.charAt(0)?.toUpperCase() ?? "?";
}
