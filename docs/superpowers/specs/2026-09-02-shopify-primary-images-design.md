# Shopify primary-image flow

## Goal

Show the Shopify primary product image consistently in live catalog tiles and the shared canvas, then provide those same primary images to Gemini with the virtual try-on request.

## Data and product identity

The Storefront MCP normalizer preserves only a product primary image associated with that product ID. A live canvas item snapshots the source-qualified product ID and validated primary image URL at add time; later catalog refreshes cannot replace it. The primary image is deliberately retained even if the shopper selects a different variant of the same product.

## UI

Live Shopify candidate cards and canvas items render the stored primary image. Missing images or browser load failures use the existing neutral garment artwork; broken image icons are never shown.

## Gemini image boundary

The browser sends at most four snapshotted image URLs with normalized garment text. The try-on route treats URLs as untrusted and fetches them only server-side under these rules:

- Parse URLs with the platform URL parser; require HTTPS on port 443 only and an exact hostname of `cdn.shopify.com` or `redaifoxes.myshopify.com`.
- Use `redirect: "error"`; redirects are rejected rather than followed.
- Resolve every hostname/CNAME address and reject private, loopback, link-local, multicast, and reserved IP addresses. Use an HTTP client that pins the connection to a validated public address while retaining the original HTTPS SNI/Host, preventing DNS rebinding between validation and fetch.
- Send no credentials; use an eight-second timeout; cap each response at 5 MB and the combined payload at 12 MB.
- Accept only `image/jpeg`, `image/png`, or `image/webp`, validate the file signature against the content type, and reject non-image or error responses.
- Convert accepted image bytes to Gemini inline parts with the validated MIME type. If one or more image fetches fail, retain text for those garments; if all fail, allow the existing text-only generation path.

Gemini’s prompt labels product text as data and tells the model never to interpret product metadata as instructions.

## Verification

- Confirm a Shopify product with a primary image displays it in its tile and canvas, with the same snapshotted URL after a catalog refresh.
- Confirm neutral garment artwork appears for missing and browser-failed images.
- Unit-test URL parsing, exact-host allowlist, private-address rejection, redirect rejection, timeout, oversized body, invalid MIME/signature, and all-images-failed text-only fallback.
- Integration-test that valid fetched image bytes and MIME become Gemini inline image parts.
- Run TypeScript validation and a production build.
