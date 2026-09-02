declare global {
  interface Document { modelContext?: { registerTool?: (tool: { name: string; description: string; inputSchema: Record<string, unknown>; execute: (input: Record<string, unknown>) => Promise<unknown> }) => unknown } }
}
export {};
