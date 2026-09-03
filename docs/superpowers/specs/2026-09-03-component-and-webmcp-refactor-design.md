# Component and WebMCP Refactor Design

## Goal

Split `app/page.tsx` into feature components while preserving all visual output, browser behavior, API calls, WebMCP tool names, tool behavior, and shared-state semantics.

## Boundaries

- `app/workspace.ts`: workspace types, default state, slots, stores, dates, money, and pure helper functions.
- `app/components/`: navigation, hero, stylist panel, candidate studio, canvas, try-on, appointment, activity drawer, tools drawer, and generated-look modal.
- `app/webmcp/tools.ts`: complete tool definitions, including metadata, schemas, and handlers; a registration function accepts the live workspace adapters and UI callbacks.
- `app/page.tsx`: state ownership, catalog loading, tool registration wiring, and component composition only.

## Constraints

- Do not introduce React context or change the UI.
- Preserve the single live workspace state and ref used by WebMCP handlers.
- Keep complete tool definitions in one source and use it for both registration and the tools popup.
- Preserve the existing API contracts and client-side validation.

## Validation

- TypeScript passes.
- Production build passes after stopping the dev server if Windows locks `.next`.
- Compare existing flows: catalog selection, scene filtering, canvas lock/reset, try-on, appointment, activity, tool list, ChatGPT configuration, and WebMCP registration.