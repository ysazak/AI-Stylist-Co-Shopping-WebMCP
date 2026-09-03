# ChatGPT Launch and WebMCP Tool List Design

## Scope

Add two independent controls to the existing co-shopping page without changing the current WebMCP activity drawer.

## ChatGPT button

- Add a standalone fixed `ChatGPT` button beside the existing activity control.
- Read the destination from `NEXT_PUBLIC_CHATGPT_URL`.
- Validate an absolute `https:` URL before rendering a standard new-tab link with `target="_blank"` and `rel="noopener noreferrer"`. Permit `http:` only for local development; reject relative, malformed, `javascript:`, and `data:` values.
- If the variable is absent or invalid, render the control disabled with an explanatory accessible label.
- Document the variable in `.env.example` without providing a real value.

## WebMCP tools button

- Add a separate fixed `WebMCP tools` button beside the existing activity control.
- Open a dedicated popup using the same drawer styling, placement, headings, scroll behavior, and mobile treatment as WebMCP activity. Both popup controls expose `aria-expanded` and `aria-controls`; Escape closes the active drawer and focus returns to its trigger.
- List every tool declared for `document.modelContext.registerTool`, with its name and description.
- The list is available whether WebMCP is supported; its purpose is transparent tool discovery rather than connection status.
- Opening one popup closes the other, so the two drawers never overlap.

## Data flow and behavior

- Define each complete tool definition once—name, description, input schema, and execute handler—and use that source for both browser registration and the tools popup, preventing drift.
- Continue registering each tool only when `document.modelContext.registerTool` is available.
- Keep activity logging and the current `WebMCP activity` drawer unchanged.

## Validation

- TypeScript must pass.
- Verify the ChatGPT button opens the configured URL and is disabled without it.
- Verify the tool popup contains every registered tool and matches activity-drawer styling.
- Verify activity and tools popups are mutually exclusive on desktop and mobile.