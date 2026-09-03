import type { Slot } from "./catalog";
import type { CatalogCard, CatalogProduct } from "./shopify/storefront-mcp";
import type { TryOnProductPayload } from "./workspace";

/** Reads the live catalog for one canvas slot from `GET /api/catalog`. */
export async function fetchCatalogSlot(slot: Slot): Promise<CatalogCard[]> {
  const response = await fetch(`/api/catalog?slot=${slot}`);
  const data = (await response.json()) as { products?: CatalogCard[] };
  if (!response.ok || !data.products) throw new Error("catalog_unavailable");
  return data.products;
}

export type CategoryProductsResult =
  | { ok: true; source: "shopify"; products: CatalogCard[] }
  | { ok: false; error: string };

/** Reads every product for a canvas slot from `GET /api/catalog`, preserving the raw success/error envelope for WebMCP tool responses. */
export async function fetchCategoryProducts(
  slot: string,
): Promise<CategoryProductsResult> {
  const response = await fetch(`/api/catalog?slot=${slot}`);
  const data = (await response.json()) as {
    source?: "shopify";
    products?: CatalogCard[];
    error?: string;
  };
  return response.ok && data.products
    ? { ok: true, source: "shopify", products: data.products }
    : { ok: false, error: data.error ?? "catalog_unavailable" };
}

export type ProductDetailsResult =
  | { ok: true; source: "shopify"; product: CatalogProduct }
  | { ok: false; error: string };

/** Reads normalized product detail from `GET /api/catalog/product`, preserving the raw success/error envelope for WebMCP tool responses. */
export async function fetchProductDetails(
  slot: string,
  productId: string,
): Promise<ProductDetailsResult> {
  const response = await fetch(
    `/api/catalog/product?slot=${slot}&id=${encodeURIComponent(productId)}`,
  );
  const data = (await response.json()) as {
    source?: "shopify";
    product?: CatalogProduct;
    error?: string;
  };
  return response.ok && data.product
    ? { ok: true, source: "shopify", product: data.product }
    : { ok: false, error: data.error ?? "catalog_unavailable" };
}

export type TryOnRequest = {
  productIds: string[];
  products: TryOnProductPayload[];
  occasion: string;
  budget: number;
};

/** Requests a generated virtual try-on image from `POST /api/try-on`. */
export async function generateTryOnImage(
  request: TryOnRequest,
): Promise<string> {
  const response = await fetch("/api/try-on", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  const data = (await response.json()) as { image?: string; error?: string };
  if (!response.ok || !data.image)
    throw new Error(data.error ?? "No image was returned.");
  return data.image;
}

const imageMime = (body: Uint8Array, contentType: string) => {
  const png =
    body.length > 8 &&
    body[0] === 137 &&
    body[1] === 80 &&
    body[2] === 78 &&
    body[3] === 71;
  const jpeg =
    body.length > 3 && body[0] === 255 && body[1] === 216 && body[2] === 255;
  const webp =
    body.length > 12 &&
    String.fromCharCode(...body.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...body.slice(8, 12)) === "WEBP";
  return png && contentType === "image/png"
    ? "image/png"
    : jpeg && contentType === "image/jpeg"
      ? "image/jpeg"
      : webp && contentType === "image/webp"
        ? "image/webp"
        : undefined;
};

/** Server-side: downloads and validates one reference product image (already allow-listed by the caller) for the try-on prompt. Returns undefined on any failure so callers can skip the image and continue text-only. */
export async function fetchReferenceImageBytes(
  url: URL,
): Promise<{ data: string; mimeType: string } | undefined> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "error",
      headers: { Accept: "image/jpeg,image/png,image/webp" },
      cache: "no-store",
    });
    const type =
      response.headers.get("content-type")?.split(";")[0].toLowerCase() ?? "";
    const length = Number(response.headers.get("content-length") ?? 0);
    if (!response.ok || length > 5_000_000) return undefined;
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length > 5_000_000) return undefined;
    const mimeType = imageMime(bytes, type);
    if (!mimeType) return undefined;
    return { data: Buffer.from(bytes).toString("base64"), mimeType };
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
}
