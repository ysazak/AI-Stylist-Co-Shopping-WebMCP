# Shopify Storefront MCP catalog implementation plan

## Scope

Integrate live read-only catalog discovery from `redaifoxes.myshopify.com` into the existing styling canvas. Use Shopify Storefront MCP UCP endpoints and the approved profile. The implementation preserves legacy demo products only as a labelled fallback for Shopify transport/malformed-response errors.

## 1. Add normalized catalog domain types

**Files:** `app/catalog.ts`, new `app/shopify/types.ts`

- Separate the legacy demo product data from shared runtime catalog types.
- Define `CatalogSource`, `Money`, `ProductReference`, `CatalogCard`, `CatalogProduct`, `CatalogVariant`, and canvas-item price snapshots.
- Change product lookup, candidate records, and slot compatibility helpers to resolve source-qualified registry keys such as `shopify:<product-id>` and `demo:<product-id>`.
- Preserve the existing static data through an adapter so existing UI paths still render while Shopify is unavailable.

## 2. Build a server-only Storefront MCP client

**New file:** `app/shopify/storefront-mcp.ts`

- Target `https://redaifoxes.myshopify.com/api/ucp/mcp`.
- Define the profile URL as a server constant.
- Create typed JSON-RPC request helpers for `search_catalog` and `get_product`; include `meta.ucp-agent.profile`, unique request IDs, the NL/en buyer context, no pagination, and a seven-second abort timeout.
- Map canvas slots to these exact query values:
  - `top` → `Clothing Tops`
  - `bottom` → `Pants`
  - `shoes` → `Shoes`
  - `accessory` → `Clothing Accessories`
- Validate JSON-RPC/UCP envelopes, response IDs, product IDs, field types, money minor units/currency, and complete category responses.
- Normalize merchant text before use: Unicode normalization, remove controls, collapse whitespace, and cap length. Accept images only from HTTPS Shopify CDN or the configured shop domain.
- Classify results from their Shopify product type/taxonomy category against the configured mapping. Omit unclassified or mismatched items.
- Implement bounded in-memory cache: lists 60 seconds / 128 entries; details 15 seconds / 256 entries; never cache errors.

## 3. Expose safe internal catalog APIs

**New files:** `app/api/catalog/route.ts`, `app/api/catalog/product/route.ts`

- `GET /api/catalog?slot=<slot>` validates the slot and returns normalized Shopify cards with all normalized category cards.
- `GET /api/catalog/product?id=<id>&selected=<optional-json>` bounds and parses selected options; allow at most three unique `{name,label}` selections, each 1–80 characters and total encoded size no more than 2,048 characters.
- Canonicalize option selections before the detail cache lookup and reject unknown/duplicate selections.
- Return only normalized fields. Use `400 invalid_category`, `404 product_not_found`, and `502 catalog_unavailable`; do not expose Shopify response data, endpoint details, or stack traces.

## 4. Migrate the client workspace to the runtime registry

**Files:** `app/page.tsx`, `app/catalog.ts`

- Add a hydrated product registry to workspace/client state and convert candidates from raw demo IDs to `ProductReference` values.
- Load the active Shopify category when a candidate tab becomes active; retain the current visible grid until a successful result arrives.
- Render explicit states: loading, Shopify success with no products, Shopify error with the labelled static demo fallback, and active Shopify candidates.
- Update candidate cards to use normalized title, safe image/fallback art, money formatting, and source markers.
- Keep rejection, selection, lock, output total, item display, empty canvas, activity logging, and modal labels compatible with source-qualified keys.
- Only sum snapshot minor amounts when every selected item has the same currency. Display a clear no-total state otherwise.

## 5. Add product-detail and variant selection flow

**Files:** `app/page.tsx`, `app/globals.css`

- Open a compact detail/variant chooser for Shopify candidates before placement.
- Auto-select only a single purchasable variant. For multiple or required options, require available option selections.
- Disable Add to canvas unless the selected variant is purchasable.
- On add, store the resolved product, selected variant, selected options, image, money, and title in the registry/canvas snapshot. Do not refresh old snapshots silently.

## 6. Update virtual try-on input

**Files:** `app/page.tsx`, `app/api/try-on/route.ts`

- Send selected normalized item snapshots rather than relying on static IDs alone.
- Validate at most four snapshots server-side and use only normalized title, variant title, material/description, and validated product attributes in the Gemini prompt.
- Delimit merchant fields and instruct Gemini to treat them as product data, never instructions. Do not pass raw upstream payloads or unvalidated image URLs.
- Continue supporting existing static demo items through the same normalized representation.

## 7. Extend WebMCP safely

**Files:** `app/page.tsx`, `app/types.d.ts`

- Give every existing WebMCP tool an explicit input schema.
- Add `get_shopify_category_products` with a validated slot and optional cursor; return up to twelve normalized cards.
- Add `get_shopify_product_details` with a bounded product ID and selected-option values; return one normalized detail object.
- Update `set_outfit_candidates` to accept up to twelve source-qualified product references.
- Update `replace_outfit_item` to accept `{ slot, productRef, variantId?, reason }`. For Shopify products, resolve details and verify that the exact requested variant belongs to the product, is purchasable, and matches the requested slot before writing the canvas.
- Keep shopper locks enforced. Log catalog reads as `read` and successful styling mutations as `write`; return only safe application errors.

## 8. Test and validate

**New test files / existing test setup as needed**

- Add mocked MCP contract tests for valid list/detail, UCP tool error, malformed JSON, timeout, pagination, successful empty category, invalid category, missing product, unavailable product, option validation, and out-of-stock variants.
- Test cache TTL/keys and error non-caching.
- Test mapping/classification, normalization, image allowlisting, money snapshots, mixed-currency totals, demo fallback, and no fallback for legitimate empty Shopify results.
- Test WebMCP read tools plus a complete live-product replacement path, including bad variant rejection and lock protection.
- Run `npm run build`, then test all four Shopify categories live after their merchant categories contain products.

## Completion criteria

The candidate studio shows real Shopify results for all four mapped categories; a shopper can view details, choose an available variant, and add it to the canvas. Live items participate correctly in locks, totals, WebMCP, appointment context, and Gemini virtual try-on. Catalog failures remain safe and clearly differentiated from a real empty category.