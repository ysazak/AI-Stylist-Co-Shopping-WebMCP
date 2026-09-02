# Shopify Storefront MCP catalog integration

## Goal

Replace the demo-only candidate catalog with live, read-only product discovery from `redaifoxes.myshopify.com`. Preserve the styling experience: shoppers browse one canvas category at a time, inspect a product, and add a compatible variant to the shared canvas.

## Verified connection

The Storefront MCP UCP endpoint accepts unauthenticated requests when the storefront is publicly accessible. The integration uses this agent profile on every catalog call:

`https://shopify.dev/ucp/agent-profiles/examples/2026-08-25/valid-with-capabilities.json`

## Category mapping

| Canvas category | Shopify category identifier |
| --- | --- |
| Upper layer | `tops` |
| Trousers | `trousers` |
| Footwear | `shoes` |
| Finishing touches | `accessories` |

## Architecture

### Shopify MCP client

A server-only module owns JSON-RPC calls to `https://redaifoxes.myshopify.com/api/ucp/mcp`. It sends `search_catalog` to list category candidates and `get_product` for full product and variant data. It validates JSON-RPC and UCP errors before returning a compact, UI-safe data shape.

### API routes

`GET /api/catalog?category=<canvas-category>` resolves the category mapping, queries Shopify, and returns normalized candidate cards. `GET /api/catalog/<product-id>` fetches normalized product details for a selected product. The browser does not call Shopify directly.

### Candidate experience

The category tabs remain the source of navigation. Switching tabs fetches the matching Shopify category and renders real product image, title, price, and availability. Adding an item first loads detail, then adds a selected or default in-stock variant to the canvas. Items retain their Shopify product and variant IDs for future follow-on features.

### Fallback and resilience

If the API call fails, returns malformed data, or returns no usable candidates, the existing demo catalog remains available and the UI indicates Shopify catalog data is unavailable. The route uses a short revalidation/cache window to reduce repeated remote calls without showing stale availability for long.

### WebMCP

Register two read-only tools:

- `get_shopify_category_products`: returns the normalized candidates for a canvas category.
- `get_shopify_product_details`: returns detailed product and variant data for an ID.

The existing outfit-editing tools remain responsible for placement, locking, and constraints. The new tools do not change a shopper's canvas.

## Error handling

Invalid categories return 400. Missing products return 404. Shopify transport, JSON-RPC, and UCP errors return a safe 502 response with no upstream body leakage. The client keeps the current candidate grid visible if a refresh fails.

## Verification

- Test each mapped category against the live Storefront MCP endpoint after its Shopify category exists and contains products.
- Confirm a product detail response includes a selectable purchasable variant.
- Confirm the fallback grid appears when Shopify is unavailable.
- Confirm the two new WebMCP tools return data and do not mutate the outfit.
- Run a production build and manually verify browser interaction.