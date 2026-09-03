"use client";
import { Product, Slot } from "../catalog";
import {
  Appointment,
  money,
  OutfitItem,
  slots,
  TryOnState,
  Workspace,
} from "../workspace";
import { AppointmentPanel } from "./AppointmentPanel";
import { TryOnPanel } from "./TryOnPanel";

type Props = {
  items: OutfitItem[];
  activeSlot: Slot;
  budget: number;
  total: number;
  lookupProduct: (id?: string) => Product | undefined;
  update: (recipe: (current: Workspace) => Workspace) => void;
  human: (action: string, recipe: (current: Workspace) => Workspace) => void;
  lock: (slot: Slot) => void;
  setShowTryOn: (value: boolean) => void;
  setShowAppointment: (value: boolean) => void;
  setTryOn: (value: TryOnState) => void;
  setShowLookModal: (value: boolean) => void;
  generateTryOn: () => void;
  showTryOn: boolean;
  tryOn: TryOnState;
  showAppointment: boolean;
  appointment: Appointment;
};

export function Canvas({
  items,
  activeSlot,
  budget,
  total,
  lookupProduct,
  update,
  human,
  lock,
  setShowTryOn,
  setShowAppointment,
  setTryOn,
  setShowLookModal,
  generateTryOn,
  showTryOn,
  tryOn,
  showAppointment,
  appointment,
}: Props) {
  return (
    <div className="canvas">
      <div className="sectionhead">
        <div>
          <p className="eyebrow">THE OUTFIT</p>
          <h2>Shared canvas</h2>
        </div>
        <div className="canvasheadcontrols">
          <button
            className="emptycanvas"
            onClick={() => {
              human("Human emptied the canvas", (c) => ({
                ...c,
                items: [],
                appointment: { ...c.appointment, confirmed: false },
              }));
              setShowTryOn(false);
              setShowAppointment(false);
              setTryOn({ status: "idle" });
            }}
          >
            Empty canvas
          </button>
        </div>
      </div>
      <div className="slotgrid">
        {slots.map((slot) => {
          const item = items.find((x) => x.slot === slot.id);
          const product = lookupProduct(item?.productId);
          return (
            <article
              className={`slot ${item ? "filled" : ""} ${activeSlot === slot.id ? "active" : ""}`}
              key={slot.id}
              onClick={() => update((c) => ({ ...c, activeSlot: slot.id }))}
            >
              <div className="slotnum">0{slots.indexOf(slot) + 1}</div>
              {product ? (
                <>
                  <div
                    className={`swatch ${product.color.toLowerCase().replace(" ", "-")}`}
                  >
                    {product.image && (
                      <img
                        src={product.image}
                        alt=""
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    )}
                  </div>
                  <div className="slotcopy">
                    <p>{slot.label}</p>
                    <h3>{product.name}</h3>
                    <span>
                      {product.material} ·{" "}
                      {product.price
                        ? money(product.price)
                        : "Price on selection"}
                    </span>
                  </div>
                  <div className="badges">
                    <b className={item?.source === "human" ? "human" : "agent"}>
                      {item?.source === "human" ? "YOUR CHOICE" : "AI PICK"}
                    </b>
                    {item?.locked && <b className="locked">⌁ LOCKED BY YOU</b>}
                  </div>
                  <button
                    aria-label={`${item?.locked ? "Unlock" : "Lock"} ${product.name}`}
                    className="lock"
                    onClick={(e) => {
                      e.stopPropagation();
                      lock(slot.id);
                    }}
                  >
                    {item?.locked ? "Unlock" : "Keep this"}
                  </button>
                </>
              ) : (
                <>
                  <div className="emptyline" />
                  <div className="slotcopy">
                    <p>{slot.label}</p>
                    <h3>Open for an idea</h3>
                    <span>{slot.note}</span>
                  </div>
                </>
              )}
            </article>
          );
        })}
      </div>
      <div className="total">
        <span>Outfit total</span>
        <strong className={total > budget ? "over" : ""}>{money(total)}</strong>
        <small>of {money(budget)}</small>
      </div>
      <div className="canvasactions">
        <button
          disabled={items.length < 2}
          onClick={() => {
            human("Human requested virtual try-on", (c) => ({ ...c }));
            setShowTryOn(true);
            generateTryOn();
          }}
        >
          Generate my look
        </button>
        <button
          disabled={items.length < 2}
          onClick={() => {
            human("Human opened in-store fitting reservation", (c) => ({
              ...c,
            }));
            setShowAppointment(true);
          }}
        >
          I want to try this in-store
        </button>
      </div>
      {showTryOn && (
        <TryOnPanel
          tryOn={tryOn}
          items={items}
          lookupProduct={lookupProduct}
          onGenerateAgain={generateTryOn}
          onOpenLookModal={() => setShowLookModal(true)}
        />
      )}
      {showAppointment && (
        <AppointmentPanel appointment={appointment} human={human} />
      )}
    </div>
  );
}
