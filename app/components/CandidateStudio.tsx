"use client";
import { Product, Slot } from "../catalog";
import { money, slots, Workspace } from "../workspace";

type Props = {
  rationale: string;
  activeSlot: Slot;
  catalogStatus: "loading" | "ready" | "empty" | "unavailable";
  visibleCandidateIds: string[];
  rejectedProductIds: string[];
  lookupProduct: (id?: string) => Product | undefined;
  update: (recipe: (current: Workspace) => Workspace) => void;
  selectProduct: (id: string) => void;
  reject: (id: string) => void;
};

export function CandidateStudio({
  rationale,
  activeSlot,
  catalogStatus,
  visibleCandidateIds,
  rejectedProductIds,
  lookupProduct,
  update,
  selectProduct,
  reject,
}: Props) {
  return (
    <section id="candidates" className="candidates">
      <div className="candidatehead">
        <div>
          <p className="eyebrow">CURATED FOR THE CANVAS</p>
          <h2>Candidate studio</h2>
          <p>{rationale}</p>
        </div>
        <div className="tabs">
          {slots.map((slot) => (
            <button
              key={slot.id}
              onClick={() => update((c) => ({ ...c, activeSlot: slot.id }))}
              className={activeSlot === slot.id ? "selected" : ""}
            >
              {slot.label}
            </button>
          ))}
        </div>
      </div>
      {catalogStatus !== "ready" && (
        <div className="catalogstatus">
          {catalogStatus === "loading"
            ? "Loading products…"
            : catalogStatus === "empty"
              ? "No products available."
              : "Products are unavailable."}
        </div>
      )}
      <div className="productgrid">
        {visibleCandidateIds
          .filter((id) => !rejectedProductIds.includes(id))
          .map((id, index) => {
            const product = lookupProduct(id);
            if (!product) return null;
            return (
              <article
                className="product"
                key={id}
                style={{ animationDelay: `${index * 70}ms` }}
              >
                <div
                  className={`productart ${product.color.toLowerCase().replace(" ", "-")}`}
                >
                  <span>{product.category}</span>
                  {product.image ? (
                    <img
                      className="productimage"
                      src={product.image}
                      alt={product.name}
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="garment" />
                  )}
                </div>
                <div className="productmeta">
                  <p>
                    {product.color} · {product.material}
                  </p>
                  <h3>{product.name}</h3>
                  <strong>
                    {product.price ? money(product.price) : "View details"}
                  </strong>
                </div>
                <div className="productactions">
                  <button onClick={() => selectProduct(id)}>
                    Add to canvas <span>↗</span>
                  </button>
                  <button
                    aria-label={`Reject ${product.name}`}
                    className="reject"
                    onClick={() => reject(id)}
                  >
                    Not this
                  </button>
                </div>
              </article>
            );
          })}
      </div>
    </section>
  );
}
