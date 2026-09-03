"use client";
import { Product } from "../catalog";
import { OutfitItem } from "../workspace";

type Props = {
  show: boolean;
  image?: string;
  items: OutfitItem[];
  lookupProduct: (id?: string) => Product | undefined;
  onClose: () => void;
};

export function GeneratedLookModal({
  show,
  image,
  items,
  lookupProduct,
  onClose,
}: Props) {
  if (!show || !image) return null;
  return (
    <div
      className="lookoverlay"
      role="dialog"
      aria-modal="true"
      aria-label="Generated virtual try-on"
    >
      <button
        className="overlaybackdrop"
        aria-label="Close enlarged look"
        onClick={onClose}
      />
      <div className="lookmodal">
        <button className="closelook" onClick={onClose}>
          Close ×
        </button>
        <img
          src={image}
          alt="Full-size AI-generated static model wearing the selected outfit"
        />
        <div className="lookmodalfooter">
          <div>
            <p className="eyebrow">THE LOOK</p>
            <h2>Canvas, brought to life.</h2>
          </div>
          <div className="lookmodalitems">
            {items.map((item) => (
              <span key={item.slot}>
                <b>{item.slot}</b>
                {lookupProduct(item.productId)?.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
