const MAX_ENCODED = 1_200_000;

export function parseReceiptDataUrl(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string") {
    throw new Error("Receipt must be a file");
  }
  const ok =
    value.startsWith("data:image/") || value.startsWith("data:application/pdf");
  if (!ok) {
    throw new Error("Receipt must be an image or PDF");
  }
  if (value.length > MAX_ENCODED) {
    throw new Error("Receipt is too large — keep images and PDFs under ~900KB");
  }
  return value;
}
