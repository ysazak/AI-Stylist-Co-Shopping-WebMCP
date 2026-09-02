# Make This Look Mine

A premium, local-only co-shopping demo for the OpenAI WebMCP Challenge. The shopper and the AI stylist act on one visible outfit workspace: every selection, rejection, lock, budget, and occasion update is live shared state.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The app works as a complete shopping workspace in ordinary browsers. A supported WebMCP-enabled Chrome/ChatGPT browser environment is required for a connected model to discover and call tools.

## WebMCP

On page mount, the app feature-detects `document.modelContext.registerTool` and registers the following real browser tools. Outside supported browsers, it shows a non-blocking readiness message and still loads normally.

| Tool | Inputs | Effect |
| --- | --- | --- |
| `get_outfit_state` | none | Reads the live workspace, provenance, locks, constraints, last shopper action, and revision. |
| `get_visible_candidates` | none | Reads the currently visible candidates for the active slot. |
| `set_outfit_candidates` | `slot`, `productIds`, `rationale` | Replaces the visible candidates for a slot. |
| `replace_outfit_item` | `slot`, `productId`, `reason` | Replaces an unlocked item; refuses a locked one. |
| `lock_outfit_item` | `slot` | Locks the selected slot. |
| `set_outfit_constraint` | `type`, `value` | Changes budget, occasion, color, formality, or fit. |
| `explain_current_outfit` | `explanation` | Updates the visible stylist reasoning. |
| generate_virtual_try_on | none | Generates and displays a Gemini virtual try-on from the live canvas selection. |

All mutation tools validate unknown products, duplicate candidate IDs, incompatible slots, bad constraints, and locked-item conflicts. Successful mutations increment the shared revision and appear in the secondary WebMCP activity drawer.

There is intentionally no fake “stylist respond” control. In a supported environment, let the agent call the registered tools; the activity drawer is evidence of the human → agent → page loop.

## Shared state design

The React page keeps one central workspace model. The UI reads from it and each WebMCP handler reads/mutates that same live model, so agent context is never a hidden copy. Shopper actions mark provenance as `YOUR CHOICE`, agent calls render as `AI PICK`, and locks render as `LOCKED BY YOU`.

## Three-minute demo

1. Click **Demo reset**: €500, Everyday, empty canvas.
2. Ask the connected agent to inspect state and create the Italian-summer starting look using: `cream-linen-overshirt`, `dark-olive-pleated-trouser`, and `white-leather-sneaker`.
3. Lock the trousers with **Keep this** and select **Client Meeting**.
4. Ask the agent to call `get_outfit_state`. It should preserve the locked trousers, replace shoes with `brown-suede-loafer`, and call `explain_current_outfit` to explain the increased polish.
5. Select or keep `cream-linen-overshirt`, then lock it.
6. Ask the agent to re-read state and complete the look with `cognac-belt` or `olive-silk-pocket-square`, keeping the total under the visible €500 budget.
7. Open **WebMCP activity** to show the exact read/write tool sequence.

## Notes

The catalog is deterministic local TypeScript data (24 products), with CSS-generated product artwork to prevent broken remote image dependencies. No authentication, inventory, payment, external commerce APIs, or backend is required.

## Virtual try-on

The canvas includes a static editorial model and a **Generate my look** action. It sends only the selected local catalog product IDs, occasion, and budget to the server—there is no photo upload or image storage.

1. Copy `.env.example` to `.env.local`.
2. Set `GEMINI_API_KEY` to your Google AI Studio Gemini API key.
3. Restart `npm run dev` after changing the environment file.

`POST /api/try-on` validates the selected items server-side and uses `gemini-3-pro-image-preview` through the official `@google/genai` SDK. If the key is absent or Gemini does not return an image, the UI shows a clear retryable message while keeping the static model visible.