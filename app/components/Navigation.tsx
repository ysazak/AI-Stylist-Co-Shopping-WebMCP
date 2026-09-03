"use client";

type Props = { onReset: () => void };

export function Navigation({ onReset }: Props) {
  return (
    <nav>
      <a className="mark" href="#top">
        M/ <i>mine</i>
      </a>
      <div className="navlinks">
        <a href="#workspace">Workspace</a>
        <a href="#candidates">Candidates</a>
        <a href="#how">How it works</a>
      </div>
      <button className="reset" onClick={onReset}>
        Demo reset <span>↺</span>
      </button>
    </nav>
  );
}
