# Virtual Try-On Design

## Goal

Add a demo-ready virtual try-on surface to the shared outfit canvas. It uses a fixed editorial model—never a shopper photo—and generates a full-body fashion image from the live selected outfit.

## UI

A compact Try On card sits beside the outfit canvas. Before a generation it presents a tasteful static model illustration, selected-item chips, and a `Generate my look` button. During a request it keeps the model frame present with a clear loading treatment. On success it presents the generated image with `Generate again`. Empty canvas state explains that at least one selected item is needed.

## Data flow

The React client derives the selected product IDs and metadata from the existing live workspace state. It posts those IDs to `POST /api/try-on`; it never sends the original reference image and has no upload control.

The route validates a bounded, deduplicated list of known catalog IDs. It builds an editorial prompt from product name, colour, material, fit, occasion and budget, then calls Gemini image generation with `gemini-3-pro-image-preview` through the current `@google/genai` server SDK. The API key remains exclusively in `GEMINI_API_KEY` in `.env.local` and is never exposed to the browser.

The route extracts the returned image part, validates its base64 payload and MIME type, then returns a `data:` URL. It returns useful HTTP errors for missing keys, malformed selections, upstream failures and responses without an image. The client renders errors in the Try On panel and retains the static model so the shopping workspace remains usable.

## Reliability and safety

No images or requests are persisted. Input is capped to four catalog products and prompts explicitly request a single adult editorial model, fully clothed, without logos or text. Requests are disabled while one is active. The feature will be documented in README with install configuration: `GEMINI_API_KEY=...` in `.env.local`.

## Verification

Test empty and populated canvas states, disabled/loading/error states, API input validation, missing-key handling, and a successful response against a manually supplied key. The normal app build must remain functional when no key is configured.