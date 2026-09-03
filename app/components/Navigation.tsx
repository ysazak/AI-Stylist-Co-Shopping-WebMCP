"use client";

type Props = { onReset: () => void };

export function Navigation({ onReset }: Props) {
  return (
    <nav>
      <div className="brand">
        <span className="mark">
          AI <i>stylist</i>
        </span>
      </div>
      <button className="reset" onClick={onReset}>
        Demo reset <span>↺</span>
      </button>
    </nav>
  );
}
