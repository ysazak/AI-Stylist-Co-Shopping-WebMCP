# Shopify primary-image flow

## Goal

Show the Shopify primary product image consistently in live catalog tiles and the shared canvas, then provide those same primary images to Gemini with the virtual try-on request.

## Data flow

The existing server-side Storefront MCP normalizer preserves only validated HTTPS primary product images from Shopify CDN or the configured store domain. The catalog API returns that URL in each normalized card and product detail response. A live canvas item stores the image URL snapshot at the time it is added.

## UI

Live Shopify candidate cards render their primary image in the tile. Canvas items render that same image. If an image is missing or fails to load, the neutral garment artwork remains visible; no broken image icon is shown. Product primary images are used consistently even if the shopper selects a different variant.

## Gemini

The browser sends the selected live canvas primary-image URLs with the existing normalized garment data to the server. The try-on route re-validates URL count, protocol, hostname, and length before fetching the images server-side. It passes the images as Gemini inline image parts alongside a prompt that treats all product data as reference material, never instructions. Image fetch failures do not fail the try-on: Gemini receives the safe text description for that item instead.

## Verification

- Confirm a Shopify product with a primary image displays it in its tile and canvas.
- Confirm the fallback artwork displays for missing or failed image URLs.
- Mock Gemini request construction to confirm validated primary images are sent as image parts.
- Confirm invalid image URLs are rejected and never fetched.
- Run TypeScript validation and a production build.