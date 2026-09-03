export type WebMcpInput = Record<string, unknown>;
export type WebMcpTool = { name: string; description: string; inputSchema: Record<string, unknown>; execute: (input: WebMcpInput) => Promise<unknown> };

/** Creates the exact object consumed by ModelContext.registerTool and the tools drawer. */
export function defineWebMcpTool(name: string, description: string, execute: (input: WebMcpInput) => Promise<unknown>, inputSchema: Record<string, unknown> = { type: "object", properties: {} }): WebMcpTool {
  return { name, description, inputSchema, execute };
}