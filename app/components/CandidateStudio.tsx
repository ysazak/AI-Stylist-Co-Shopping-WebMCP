"use client";
import { Product, Slot } from "../catalog";
import { money, slots, Workspace } from "../workspace";

type Props = {
  activeSlot: Slot;
  catalogStatus: "loading" | "ready" | "empty" | "unavailable";
  visibleCandidateIds: string[];
  lookupProduct: (id?: string) => Product | undefined;
  update: (recipe: (current: Workspace) => Workspace) => void;
  selectProduct: (id: string) => void;
};

export function CandidateStudio({
  activeSlot,
  catalogStatus,
  visibleCandidateIds,
  lookupProduct,
  update,
  selectProduct,
}: Props) {
  return (
    <section id="candidates" className="candidates">
      <div className="candidatehead">
        <div>
          <p className="eyebrow">CURATED FOR THE CANVAS</p>
          <div className="titlerow">
            <h2>Mix &amp; Match Studio</h2>
          </div>
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
        {visibleCandidateIds.map((id, index) => {
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
                <h3>{product.name}</h3>
                <strong>
                  {product.price ? money(product.price) : "View details"}
                </strong>
              </div>
              <div className="productactions">
                <button onClick={() => selectProduct(id)}>
                  Add to canvas <span>↗</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
