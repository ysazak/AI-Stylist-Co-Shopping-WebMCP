"use client";
import { money, Workspace } from "../workspace";

type Props = {
  explanation: string;
  occasion: string;
  lastHumanAction: string | null;
  budget: number;
  human: (action: string, recipe: (current: Workspace) => Workspace) => void;
};

export function StylistPanel({
  explanation,
  occasion,
  lastHumanAction,
  budget,
  human,
}: Props) {
  return (
    <aside className="stylist">
      <p className="eyebrow">YOUR STYLIST</p>
      <div className="portrait">
        S<span>✦</span>
      </div>
      <h2>
        Stylist
        <br />
        <em>notes.</em>
      </h2>
      <blockquote>“{explanation}”</blockquote>
      <div className="context">
        <span>OCCASION</span>
        <strong>{occasion}</strong>
        <span>LAST SIGNAL</span>
        <strong>{lastHumanAction ?? "Waiting for your first move"}</strong>
      </div>
      <div className="occasion">
        <p>Set the scene</p>
        {["Everyday", "Office"].map((item) => (
          <button
            key={item}
            className={occasion === item ? "selected" : ""}
            onClick={() =>
              human(`Human changed occasion to ${item}`, (c) => ({
                ...c,
                occasion: item,
              }))
            }
          >
            {item}
          </button>
        ))}
      </div>
      <label className="budget">
        Budget <output>{money(budget)}</output>
        <input
          aria-label="Outfit budget"
          type="range"
          min="50"
          max="700"
          step="50"
          value={budget}
          onChange={(e) =>
            human(
              `Human changed budget to ${money(Number(e.target.value))}`,
              (c) => ({ ...c, budget: Number(e.target.value) }),
            )
          }
        />
      </label>
    </aside>
  );
}
