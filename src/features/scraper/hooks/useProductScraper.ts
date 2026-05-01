import { useCallback, useState } from "react";
import {
  fetchProductPreview,
  ProductPreviewError,
} from "@/services/productPreviewApi";
import { cleanProductTitle } from "@/lib/url";
import { useWizardStore } from "@/features/scraper/stores/wizardStore";
import type { WizardImage } from "@/types";

const grayPlaceholder =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="533"><rect fill="#f2f2f7" width="100%" height="100%"/></svg>',
  );

function placeholderImages(count = 6): WizardImage[] {
  return Array.from({ length: count }, () => ({
    src: grayPlaceholder,
    placeholder: true,
  }));
}

export function useProductScraper() {
  const setImages = useWizardStore((s) => s.setImages);
  const setLoading = useWizardStore((s) => s.setLoading);
  const setError = useWizardStore((s) => s.setError);
  const setSelectedIndex = useWizardStore((s) => s.setSelectedIndex);
  const setItemName = useWizardStore((s) => s.setItemName);
  const setCustomizeSheetOpen = useWizardStore((s) => s.setCustomizeSheetOpen);
  const setCustomizeSheetPanel = useWizardStore(
    (s) => s.setCustomizeSheetPanel,
  );

  const [lastStatus, setLastStatus] = useState(0);

  const loadPreview = useCallback(async (pageUrl: string) => {
    setCustomizeSheetOpen(false);
    setCustomizeSheetPanel("menu");
    setLoading(true);
    setError("");
    setImages([]);
    setSelectedIndex(null);

    try {
      const preview = await fetchProductPreview(pageUrl);
      setLastStatus(200);
      const suggested = preview.title
        ? cleanProductTitle(preview.title)
        : "";
      const manual = useWizardStore.getState().itemNameManuallyEdited;
      if (suggested && !manual) {
        setItemName(suggested, false);
      }
      const urls = preview.images ?? [];
      if (urls.length) {
        setImages(urls.map((src) => ({ src, placeholder: false })));
      } else {
        setImages(placeholderImages());
        setError(
          "No images were found in the page HTML. Tap Customize on the first card to add your own.",
        );
      }
    } catch (e) {
      const st = e instanceof ProductPreviewError ? e.status : 0;
      const blocked = e instanceof ProductPreviewError && e.blocked;
      setLastStatus(st);
      let msg =
        e instanceof Error ? e.message : "Could not load this page.";
      if (blocked || st === 403 || st === 401) {
        msg =
          "This store blocked automatic preview. Tap Customize on the first card to upload a photo or use an emoji.";
      } else if (!msg) {
        msg =
          "Could not load this page. Tap Customize on the first card to add your own image or emoji.";
      }
      setError(msg);
      setImages(placeholderImages());
    } finally {
      setLoading(false);
    }
  }, [
    setCustomizeSheetOpen,
    setCustomizeSheetPanel,
    setError,
    setImages,
    setItemName,
    setLoading,
    setSelectedIndex,
  ]);

  return { loadPreview, lastStatus };
}
