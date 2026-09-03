"use client";
import type { RefObject } from "react";

export type ActivityEntry = {
  at: string;
  direction: "read" | "write" | "human";
  name: string;
  detail: string;
};
export type ToolPreview = { name: string; description: string };

type Props = {
  drawer: "activity" | "tools" | null;
  setDrawer: (value: "activity" | "tools" | null) => void;
  activity: ActivityEntry[];
  tools: ToolPreview[];
  chatGptUrl?: string;
  activityTrigger: RefObject<HTMLButtonElement | null>;
  toolsTrigger: RefObject<HTMLButtonElement | null>;
};
export function WorkspaceDrawers({
  drawer,
  setDrawer,
  activity,
  tools,
  chatGptUrl,
  activityTrigger,
  toolsTrigger,
}: Props) {
  return (
    <>
      <div className="drawercontrols">
        {chatGptUrl ? (
          <a
            className="chatgptbutton"
            href={chatGptUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            ChatGPT ↗
          </a>
        ) : (
          <button
            className="chatgptbutton"
            disabled
            aria-label="ChatGPT URL is not configured"
          >
            ChatGPT unavailable
          </button>
        )}
        <button
          ref={toolsTrigger}
          className="drawerbutton"
          onClick={() => setDrawer(drawer === "tools" ? null : "tools")}
          aria-expanded={drawer === "tools"}
          aria-controls="webmcp-tools-drawer"
        >
          WebMCP tools <span>{drawer === "tools" ? "−" : "+"}</span>
        </button>
        <button
          ref={activityTrigger}
          className="drawerbutton"
          onClick={() => setDrawer(drawer === "activity" ? null : "activity")}
          aria-expanded={drawer === "activity"}
          aria-controls="webmcp-activity-drawer"
        >
          WebMCP activity <span>{drawer === "activity" ? "−" : "+"}</span>
        </button>
      </div>
      {drawer === "tools" && (
        <aside
          id="webmcp-tools-drawer"
          className="drawer"
          aria-label="WebMCP tools"
        >
          <div>
            <p className="eyebrow">DEVELOPER VIEW</p>
            <h2>WebMCP tools</h2>
          </div>
          {tools.length ? (
            tools.map((tool) => (
              <div className="event" key={tool.name}>
                <time>TOOL</time>
                <b className="read">✓ {tool.name}</b>
                <span>{tool.description}</span>
              </div>
            ))
          ) : (
            <p className="quiet">Tool definitions are loading.</p>
          )}
        </aside>
      )}
      {drawer === "activity" && (
        <aside
          id="webmcp-activity-drawer"
          className="drawer"
          aria-label="WebMCP activity"
        >
          <div>
            <p className="eyebrow">DEVELOPER VIEW</p>
            <h2>WebMCP activity</h2>
          </div>
          {activity.length ? (
            activity.map((entry, i) => (
              <div className="event" key={`${entry.at}-${i}`}>
                <time>{entry.at}</time>
                <b className={entry.direction}>
                  {entry.direction === "read"
                    ? "✓"
                    : entry.direction === "write"
                      ? "→"
                      : "•"}{" "}
                  {entry.name}
                </b>
                <span>{entry.detail}</span>
              </div>
            ))
          ) : (
            <p className="quiet">
              Tool activity will appear here when a connected stylist reads or
              updates the workspace.
            </p>
          )}
        </aside>
      )}
    </>
  );
}
