# Make This Look Mine — Design

## Goal

Create a desktop-first, premium fashion co-shopping demo for the OpenAI WebMCP Challenge. The visible shopping workspace is the shared source of truth: a shopper changes the outfit, constraints, or locks; a connected AI agent reads that state through real browser WebMCP tools and updates the remaining recommendation accordingly.

## Product direction

The interface uses a restrained editorial fashion language: warm ivory canvas, near-black typography, muted olive and tobacco accents, substantial whitespace, serif display typography, and slim sans-serif utility labels. The shopping product—not developer tooling—is the hero.

The initial screen is intentionally empty after reset. A connected agent builds the reference-inspired relaxed Italian-summer starting look through registered tools. Every piece carries clear provenance:

- `AI PICK` for tool-selected pieces.
- `YOUR CHOICE` for shopper-selected pieces.
- `LOCKED BY YOU` for shopper-approved pieces that the agent cannot replace.

## Information architecture

1. A compact top navigation includes the wordmark, collection links, a cart summary, and Demo Reset.
2. A page introduction explains that the shopper and stylist edit one shared workspace.
3. The two-column primary area contains:
   - Outfit Canvas: top, bottom, shoes, and accessory slots; each has product details, provenance, lock/unlock controls, and an empty state.
   - AI Stylist panel: current explanation, visible budget total, occasion, shopper constraints, and a concise shared-state revision indicator.
4. The candidate studio below is visibly slot-scoped. Each product card supports select, reject, and keyboard access. Rejections immediately disappear from candidates.
5. A visually secondary developer drawer records WebMCP calls and arguments/results for the demo.

## State model

A single client React state model holds the complete shared workspace. It contains outfit items (`slot`, `productId`, `source`, `locked`), budget, occasion, constraints, rejected product IDs, slot-specific candidate IDs, stylist explanation, last human action, revision, and a tool activity log.

All shopper interactions mutate this store through explicit actions. Those actions increment `revision`, update `lastHumanAction`, and attach provenance. UI components render exclusively from this store. WebMCP handlers read and mutate the exact same store through an imperative store bridge, ensuring no duplicate or hidden agent state exists.

## Catalog and selection rules

The local TypeScript catalog contains 24 curated products across jackets/overshirts, shirts, trousers, sneakers, loafers, and accessories. Every item has the required catalog metadata and a stable, decorative remote image fallback designed to remain convincing without external commerce integration.

Candidate selection enforces appropriate slots and excludes rejected products. An agent replacement refuses a locked existing item and returns a useful failure result. The UI derives the outfit total from selected catalog products and flags budget pressure without blocking the agent from explaining trade-offs.

## WebMCP boundary

On mount, a dedicated browser integration registers real tools with `document.modelContext.registerTool` when available, while safely no-oping in ordinary browsers. The tools are:

1. `get_outfit_state`: returns the live shared workspace including provenance, locks, rejections, constraints, last shopper action, and revision.
2. `get_visible_candidates`: returns the live candidate cards presently shown to the shopper.
3. `set_outfit_candidates`: replaces a slot’s ordered candidates and records the rationale.
4. `replace_outfit_item`: replaces an unlocked outfit item and reports a locked conflict clearly.
5. `lock_outfit_item`: locks an item as human-approved.
6. `set_outfit_constraint`: changes budget, occasion, colour/formality/fit constraints, visibly updating state.
7. `explain_current_outfit`: writes the stylist explanation displayed in the panel.

Each tool invocation writes a time-stamped activity event for the drawer. This aids recording and validates actual integrations without serving as a fake agent interface.

## Core demo sequence

1. Reset to the clean workspace, `€500`, and `Everyday`.
2. Agent calls the tools to set the cream linen overshirt, dark olive pleated trousers, white sneakers, and candidate set.
3. Shopper locks the trousers and changes occasion to Client Meeting.
4. Agent reads `get_outfit_state`, observes the revision/locks/occasion, retains the trousers, and uses candidate/replacement tools to introduce brown suede loafers and explain why.
5. Shopper selects and locks the cream overshirt.
6. Agent reads state again, preserves both locks, and completes shoes/accessories under budget.

There is deliberately no simulated “agent respond” button: changes following shopper actions occur only when the actual connected WebMCP agent calls the registered tools.

## Errors, accessibility, and verification

The app remains usable outside WebMCP and shows non-intrusive integration readiness status. Invalid products, wrong slots, locked replacements, and malformed constraints return tool-safe messages without corrupting state. Buttons are semantic and keyboard operable, focus states are visible, images have meaningful alternate text, and responsive stacking preserves the workspace relationship.

Verification will cover the human interaction actions, real tool registration in supported browser context, tool handlers against live state, and the full three-minute collaboration sequence. README will document setup, tool contracts, architecture, Chrome 149+/supported ChatGPT browser testing, and the demo script.
