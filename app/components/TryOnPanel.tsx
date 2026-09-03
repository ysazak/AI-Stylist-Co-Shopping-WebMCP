"use client";
import { Product } from "../catalog";
import { OutfitItem, TryOnState } from "../workspace";

type Props = {
  tryOn: TryOnState;
  items: OutfitItem[];
  lookupProduct: (id?: string) => Product | undefined;
  onGenerateAgain: () => void;
  onOpenLookModal: () => void;
};

export function TryOnPanel({
  tryOn,
  items,
  lookupProduct,
  onGenerateAgain,
  onOpenLookModal,
}: Props) {
  return (
    <section className="tryon">
      <div className="tryonhead">
        <div>
          <p className="eyebrow">VIRTUAL FIT</p>
          <h3>
            {tryOn.status === "loading"
              ? "Styling your look…"
              : "Your look on."}
          </h3>
        </div>
        <button onClick={onGenerateAgain} disabled={tryOn.status === "loading"}>
          Generate again
        </button>
      </div>
      <div className="modelstage">
        {tryOn.status === "ready" && tryOn.image ? (
          <button
            className="expandlook"
            onClick={onOpenLookModal}
            aria-label="Open generated look in full size"
          >
            <img
              src={tryOn.image}
              alt="AI-generated static model wearing the selected outfit"
            />
            <span>Open full look ↗</span>
          </button>
        ) : (
          <>
            <div className="modelshape">
              <i />
              <b />
              <span />
            </div>
            {tryOn.status === "loading" && (
              <div className="generating">
                Building your look <em>✦</em>
              </div>
            )}
          </>
        )}
      </div>
      <div className="tryonitems">
        {items.length ? (
          items.map((item) => (
            <span key={item.slot}>{lookupProduct(item.productId)?.name}</span>
          ))
        ) : (
          <span>Your selected pieces will appear here.</span>
        )}
      </div>
      {tryOn.status === "error" && <p className="tryonerror">{tryOn.error}</p>}
      <p className="tryonnote">Static model · No image upload required</p>
    </section>
  );
}
