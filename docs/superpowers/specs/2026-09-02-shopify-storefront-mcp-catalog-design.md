# Shopify Storefront MCP catalog integration

## Goal

Replace the demo-only candidate grid with live, read-only products from `redaifoxes.myshopify.com`, without weakening the canvas, virtual try-on, booking, or WebMCP workflows. The static catalog remains a deliberately marked demo fallback for upstream failures only.

## Verified connection

The public Storefront MCP UCP endpoint accepts `tools/call` requests using this profile:

`https://shopify.dev/ucp/agent-profiles/examples/2026-08-25/valid-with-capabilities.json`

A live `search_catalog` request to `https://redaifoxes.myshopify.com/api/ucp/mcp` returned a UCP success response after the storefront password was removed. The `jacket` query produced a legitimate empty result; that must be displayed as an empty Shopify category, not treated as a connection failure.

## Category contract

The four merchant-provided identifiers are used as `catalog.query` terms, not undocumented `filters` values. They are intentionally configurable in one server-only mapping:

| Canvas slot | Display label | Shopify `catalog.query` |
| --- | --- | --- |
| `top` | Upper layer | `tops` |
| `bottom` | Trousers | `trousers` |
| `shoes` | Footwear | `shoes` |
| `accessory` | Finishing touches | `accessories` |

Each request sends `catalog: { query, context, pagination: { limit: 12 } }` and `meta: { "ucp-agent": { profile } }`. The initial buyer context is `address_country: "NL"` and `language: "en"`; it is part of the cache key. The server returns the merchant's product currency unchanged and the UI derives totals only when all selected items use that same currency. Different currencies show an unavailable total rather than a misleading conversion.

## Server-only Shopify client

A focused `shopifyCatalog` module owns all JSON-RPC communication. It:

- Posts to `https://redaifoxes.myshopify.com/api/ucp/mcp` with a unique request ID and a 7-second abort timeout.
- Sends `search_catalog` with the category contract above and `get_product` with a product ID and requested option selections.
- Validates the JSON-RPC envelope, UCP status, bounded pagination cursor, product ID, and normalized product shape before returning it.
- Limits list responses to 12 products and product-ID input to one non-empty Shopify GID or opaque identifier no longer than 256 characters.
- Converts monetary fields to `{ amountMinor, currency }`; display uses `Intl.NumberFormat`, while canvas totals add minor units only within one currency.
- Emits stable, safe error codes only: `invalid_category` (400), `product_not_found` (404), and `catalog_unavailable` (502). Upstream URLs, bodies, and stack traces are never returned.

Responses use a short cache keyed by category/product ID, buyer context, selection, and UCP pagination cursor. Product availability is not claimed beyond the response time.

## Internal API contract

`GET /api/catalog?slot=top` returns either:

```ts
{ source: "shopify"; products: CatalogCard[]; nextCursor?: string }
```

or a safe error. A successful empty array remains `source: "shopify"`. A failed Shopify request returns 502; only then does the browser render a separate static `source: "demo"` fallback with an explicit unavailable notice.

`GET /api/catalog/product?id=<encoded-id>&selected=<encoded-json>` returns:

```ts
{ source: "shopify"; product: CatalogProduct }
```

`CatalogCard` contains `id`, `title`, `image`, `price`, `currency`, `available`, and the mapped canvas slot. `CatalogProduct` additionally contains description, options, variants, each variant's ID, option values, price, currency, image, and purchasability. No raw Shopify response is sent to the browser.

## Runtime catalog and canvas state

The static `Product` data is generalized into one normalized runtime product type. The client maintains a hydrated product registry keyed by `source:id` and a canvas item stores the resolved registry key, slot, source, lock status, selected variant ID, and immutable price snapshot. Existing static candidates use `source: "demo"`; Shopify candidates use `source: "shopify"`.

All product lookup, slot compatibility, candidate validation, canvas rendering, totals, rejection, and try-on labels use this registry rather than `productById` alone. A Shopify product can therefore be shown, selected, replaced, locked, totalled, and included in a virtual try-on without being present in the legacy static array.

## Variant selection and inventory

A candidate opens product details before adding to the canvas. If a product has one purchasable variant, that variant is selected automatically. If it has multiple variants or required options, the shopper selects available option values first. The add action remains disabled until one purchasable variant exists. The selected variant's price, title, option labels, and image become the canvas snapshot. An unavailable product/variant cannot be added or used by a WebMCP write action.

## Virtual try-on

The try-on route accepts up to four normalized selected-item snapshots, not only legacy IDs. It validates title, selected-variant title, material/description, and product image URL or product attributes against length/type limits, then builds the Gemini prompt from those safe fields. No Shopify access token is required or sent to Gemini. Legacy demo IDs continue to resolve via the same registry shape.

## WebMCP contract

Two read-only tools use the same server client through the internal API, log a `read` activity entry, and return the normalized safe shapes:

- `get_shopify_category_products` input `{ slot: "top" | "bottom" | "shoes" | "accessory", cursor?: string }`; output up to 12 `CatalogCard` values, `nextCursor`, source, or `{ ok: false, code }`.
- `get_shopify_product_details` input `{ productId: string, selected?: Array<{ name: string; label: string }> }`; output one `CatalogProduct` or `{ ok: false, code }`.

Existing write tools gain explicit schemas and resolve a requested live product through its selected purchasable variant before placement. They enforce the existing slot compatibility and shopper lock rules, log `write` activity, and return no upstream Shopify payloads.

## Verification

1. Unit-test mapping, request construction (including profile metadata), buyer-context cache keys, money formatting/totals, GID limits, and product normalization.
2. Mock JSON-RPC/UCP responses for list success, successful empty category, malformed response, tool error, timeout, pagination, unavailable product, required-options product, and out-of-stock variant.
3. Test API 400, 404, and 502 shapes and confirm a legitimate empty Shopify category never renders the demo fallback.
4. Test shopper and WebMCP placement/replacement of a live product, including locks, variant price snapshots, canvas rendering, and try-on input.
5. Live-test all four mapped queries after their merchant catalog categories contain products; verify detail and purchasable variants for at least one product per slot.
6. Run the production build and manually verify browse, detail, add, reject, lock, total, WebMCP reads/writes, fallback, and virtual try-on.