import { Slot } from "../catalog";

export type Money = { amountMinor: number; currency: string };
export type CatalogCard = { id: string; title: string; slot: Slot; image?: string; price?: Money; available: boolean; productType?: string };
export type CatalogVariant = { id: string; title: string; available: boolean; price?: Money; selectedOptions: { name: string; value: string }[]; image?: string };
export type CatalogProduct = CatalogCard & { description?: string; options: { name: string; values: string[] }[]; variants: CatalogVariant[] };

const endpoint = "https://redaifoxes.myshopify.com/api/ucp/mcp";
const profile = "https://shopify.dev/ucp/agent-profiles/examples/2026-08-25/valid-with-capabilities.json";
const context = { address_country: "NL", language: "en" };
const mapping: Record<Slot, string> = { top: "Clothing Tops", bottom: "Pants", shoes: "Shoes", accessory: "Clothing Accessories" };
const cache = new Map<string, { until: number; value: unknown }>();
const clean = (value: unknown, max = 240) => typeof value === "string" ? value.normalize("NFKC").replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "";
const first = (...values: unknown[]) => values.find((value) => typeof value === "string" && value.trim()) as string | undefined;
const safeImage = (value: unknown) => { const raw = clean(value, 1000); try { const url = new URL(raw); return url.protocol === "https:" && (url.port === "" || url.port === "443") && (url.hostname === "cdn.shopify.com" || url.hostname === "redaifoxes.myshopify.com") ? url.toString() : undefined; } catch { return undefined; } };
const mediaImage = (value: unknown) => { const media = asArray(value).map((item) => item as Record<string, unknown>).find((item) => item.type === "image" && typeof item.url === "string"); return safeImage(media?.url); };
const money = (value: unknown): Money | undefined => { const raw = value as Record<string, unknown> | number | string | undefined; const amount = typeof raw === "object" && raw ? (raw.amount ?? raw.amount_minor ?? raw.value) : raw; const currency = typeof raw === "object" && raw && typeof (raw.currency ?? raw.currency_code) === "string" ? clean(raw.currency ?? raw.currency_code, 3).toUpperCase() : "EUR"; const numberValue = Number(amount); return Number.isFinite(numberValue) && numberValue >= 0 ? { amountMinor: Math.round(numberValue), currency: currency || "EUR" } : undefined; };
const asArray = (value: unknown) => Array.isArray(value) ? value : [];

async function call(name: string, args: Record<string, unknown>) {
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: crypto.randomUUID(), method: "tools/call", params: { name, arguments: { meta: { "ucp-agent": { profile } }, ...args } } }), signal: controller.signal, cache: "no-store" });
    if (!response.ok) throw new Error("catalog_unavailable");
    const rpc = await response.json() as { result?: { structuredContent?: unknown; content?: { text?: string }[] }; error?: unknown };
    if (rpc.error || !rpc.result) throw new Error("catalog_unavailable");
    const text = rpc.result.structuredContent ?? (rpc.result.content?.[0]?.text ? JSON.parse(rpc.result.content[0].text) : undefined);
    if (!text || typeof text !== "object") throw new Error("catalog_unavailable");
    return text as Record<string, unknown>;
  } finally { clearTimeout(timeout); }
}

function card(raw: unknown, slot: Slot): CatalogCard | undefined {
  const product = raw as Record<string, unknown>; const id = clean(first(product.id, product.product_id, product.gid), 256); const title = clean(first(product.title, product.name), 180);
  if (!id || !title) return undefined;
  const type = clean(first(product.product_type, product.productType, product.category, product.taxonomy_category), 120);
  const marker = mapping[slot].toLowerCase(); const details = `${type} ${asArray(product.tags).map((tag) => clean(tag)).join(" ")}`.toLowerCase();
  if (details && !details.includes(marker) && !marker.includes(details)) return undefined;
  const priceRange = (product.price_range ?? product.priceRange) as Record<string, unknown> | undefined; const price = money(product.price ?? priceRange?.min);
  return { id, title, slot, image: safeImage(first(product.image, product.featured_image)) ?? mediaImage(product.media), price, available: product.available !== false && product.available_for_sale !== false && (product.availability as Record<string, unknown> | undefined)?.available !== false, productType: type || undefined };
}
function detail(raw: unknown, slot: Slot): CatalogProduct | undefined {
  const base = card(raw, slot); if (!base) return undefined; const product = raw as Record<string, unknown>;
  const variants = asArray(product.variants).map((item): CatalogVariant | undefined => { const variant = item as Record<string, unknown>; const id = clean(first(variant.id, variant.variant_id), 256); if (!id) return undefined; return { id, title: clean(first(variant.title, variant.name), 160) || "Default", available: variant.available !== false && variant.available_for_sale !== false, price: money(variant.price ?? variant.price_amount), selectedOptions: asArray(first(variant.selected_options, variant.selectedOptions, variant.options)).map((option) => { const value = option as Record<string, unknown>; return { name: clean(first(value.name), 80), value: clean(first(value.value, value.label), 80) }; }).filter((option) => option.name && option.value), image: safeImage(first(variant.image, variant.featured_image)) ?? mediaImage(variant.media) }; }).filter((item): item is CatalogVariant => Boolean(item));
  const options = asArray(product.options).map((item) => { const option = item as Record<string, unknown>; return { name: clean(first(option.name), 80), values: asArray(option.values).map((value) => clean(value, 80)).filter(Boolean) }; }).filter((option) => option.name);
  return { ...base, description: clean(first(product.description_html, (product.description as Record<string, unknown> | undefined)?.html), 800) || undefined, options, variants };
}
async function cached<T>(key: string, ttl: number, fetcher: () => Promise<T>) { const item = cache.get(key); if (item && item.until > Date.now()) return item.value as T; const value = await fetcher(); if (cache.size > 256) cache.delete(cache.keys().next().value as string); cache.set(key, { until: Date.now() + ttl, value }); return value; }
export async function listProducts(slot: Slot) {
  return cached(`list:${slot}`, 60_000, async () => {
    const results: CatalogCard[] = []; const seenCursors = new Set<string>(); let cursor: string | undefined;
    do {
      const response = await call("search_catalog", { catalog: { query: mapping[slot], context, pagination: { limit: 100, ...(cursor ? { cursor } : {}) } } });
      results.push(...asArray(response.products).map((item) => card(item, slot)).filter((item): item is CatalogCard => Boolean(item)));
      const pagination = response.pagination as Record<string, unknown> | undefined; const next = clean(pagination?.next_cursor ?? pagination?.cursor ?? pagination?.end_cursor, 512);
      if (!pagination?.has_next_page || !next || seenCursors.has(next)) break; seenCursors.add(next); cursor = next;
    } while (cursor);
    return results;
  });
}
export async function getProduct(productId: string, slot: Slot) { return cached(`product:${slot}:${productId}`, 15_000, async () => { const response = await call("get_product", { catalog: { id: productId, context } }); const raw = (response.product ?? asArray(response.products)[0]); const result = detail(raw, slot); if (!result) throw new Error("product_not_found"); return result; }); }
export const isSlot = (value: string): value is Slot => value === "top" || value === "bottom" || value === "shoes" || value === "accessory";