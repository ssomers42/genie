import { supabase } from "@/services/supabase";
import type { ProductPreview } from "@/types";

type EdgeResult =
  | { ok: true; title: string | null; images: string[]; meta?: ProductPreview["meta"] }
  | {
      ok: false;
      error: string;
      blocked?: boolean;
      status?: number;
    };

export class ProductPreviewError extends Error {
  constructor(
    message: string,
    public status: number,
    public blocked?: boolean,
  ) {
    super(message);
    this.name = "ProductPreviewError";
  }
}

export async function fetchProductPreview(
  pageUrl: string,
): Promise<ProductPreview> {
  const { data, error } = await supabase.functions.invoke<EdgeResult>(
    "product-preview",
    { body: { url: pageUrl } },
  );
  if (error) {
    throw new ProductPreviewError(error.message || "Preview failed", 500);
  }
  if (!data) {
    throw new ProductPreviewError("Empty preview response", 502);
  }
  if (!data.ok) {
    throw new ProductPreviewError(
      data.error || "Preview failed",
      data.status ?? 502,
      data.blocked,
    );
  }
  return {
    title: data.title,
    images: data.images,
    meta: data.meta,
  };
}
