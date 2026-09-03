"use client";

type Props = { webMcp: "checking" | "ready" | "unavailable" };

export function Hero({ webMcp }: Props) {
  return (
    <section id="top" className="hero">
      <div className="herointro">
        <p className="eyebrow">THE SHARED WORKSPACE</p>
        <h1>
          Your look,
          <br />
          <em>your decisions.</em>
        </h1>
        <div className="status">
          <span className={webMcp === "ready" ? "dot ready" : "dot"} />{" "}
          {webMcp === "ready"
            ? "WebMCP connected — live workspace available"
            : webMcp === "checking"
              ? "Checking stylist connection…"
              : "WebMCP ready when opened in a supported browser"}
        </div>
      </div>
      <div className="quickguide">
        <p className="eyebrow">HOW TO USE IT</p>
        <ol>
          <li>
            <b>01</b>
            <span>
              <strong>Build your starting look</strong>Start with a candidate or
              a stylist pick.
            </span>
          </li>
          <li>
            <b>02</b>
            <span>
              <strong>Make it yours</strong>Lock what works. Change what does
              not.
            </span>
          </li>
          <li>
            <b>03</b>
            <span>
              <strong>Let the stylist adapt</strong>It adapts around every
              choice you keep.
            </span>
          </li>
        </ol>
      </div>
    </section>
  );
}
