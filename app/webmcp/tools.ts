import { Product, Slot, slotFor } from "../catalog";
import {
  appointmentDates,
  log,
  OutfitItem,
  slots,
  slotsFor,
  stores,
  TryOnProductPayload,
  TryOnState,
  Workspace,
} from "../workspace";
import { defineWebMcpTool, WebMcpTool } from "./tool-definition";

export type WebMcpAdapters = {
  getWorkspace: () => Workspace;
  update: (recipe: (current: Workspace) => Workspace) => void;
  lookupProduct: (id?: string) => Product | undefined;
  tryOnProducts: (items: OutfitItem[]) => TryOnProductPayload[];
  setShowTryOn: (value: boolean) => void;
  setTryOn: (value: TryOnState) => void;
  setShowAppointment: (value: boolean) => void;
};

const slotIds = slots.map((slot) => slot.id);
const storeIds = stores.map((store) => store.id);
const dateValues = appointmentDates.map((date) => date.value);

/** Builds the complete set of WebMCP tools bound to the live workspace, ready for document.modelContext.registerTool. */
export function registerWebMcpTools({
  getWorkspace,
  update,
  lookupProduct,
  tryOnProducts,
  setShowTryOn,
  setTryOn,
  setShowAppointment,
}: WebMcpAdapters): WebMcpTool[] {
  const read = () => ({ ...getWorkspace(), activity: undefined });
  const write = (
    name: string,
    detail: string,
    recipe: (current: Workspace) => Workspace,
  ) => {
    update((current) =>
      log(
        { ...recipe(current), revision: current.revision + 1 },
        "write",
        name,
        detail,
      ),
    );
    return { ok: true, revision: getWorkspace().revision + 1 };
  };
  const tool = defineWebMcpTool;
  return [
    tool(
      "get_outfit_state",
      "Read the current shared outfit workspace, including human-selected items, AI picks, locked pieces, rejected products, budget, occasion, constraints, last human action and revision.",
      async () => {
        update((c) =>
          log(
            c,
            "read",
            "get_outfit_state",
            `Read shared workspace at revision ${c.revision}`,
          ),
        );
        return read();
      },
    ),
    tool(
      "get_visible_candidates",
      "Read the products currently visible in the candidate area, including IDs, prices, categories and recommendation status.",
      async () => {
        const c = getWorkspace();
        update((x) =>
          log(
            x,
            "read",
            "get_visible_candidates",
            `Read ${c.candidates[c.activeSlot].length} visible ${c.activeSlot} candidates`,
          ),
        );
        return c.candidates[c.activeSlot]
          .map((id) => lookupProduct(id))
          .filter(Boolean);
      },
    ),
    tool(
      "get_category_products",
      "Read every currently available product for a canvas slot. Input: slot (top, bottom, shoes, accessory).",
      async (input) => {
        const slot = String(input.slot ?? "");
        if (!slots.some((item) => item.id === slot))
          return { ok: false, error: "Provide a valid canvas slot." };
        const response = await fetch(`/api/catalog?slot=${slot}`);
        const data = await response.json();
        update((current) =>
          log(
            current,
            "read",
            "get_category_products",
            `Read products for ${slot}`,
          ),
        );
        return response.ok
          ? data
          : { ok: false, error: data.error ?? "catalog_unavailable" };
      },
      {
        type: "object",
        properties: {
          slot: {
            type: "string",
            enum: slotIds,
            description: "Canvas slot to read products for.",
          },
        },
        required: ["slot"],
      },
    ),
    tool(
      "get_product_details",
      "Read normalized product details for a canvas slot. Input: slot and productId.",
      async (input) => {
        const slot = String(input.slot ?? "");
        const productId = String(input.productId ?? "");
        if (
          !slots.some((item) => item.id === slot) ||
          !productId ||
          productId.length > 256
        )
          return { ok: false, error: "Provide a valid slot and product ID." };
        const response = await fetch(
          `/api/catalog/product?slot=${slot}&id=${encodeURIComponent(productId)}`,
        );
        const data = await response.json();
        update((current) =>
          log(current, "read", "get_product_details", `Read product details`),
        );
        return response.ok
          ? data
          : { ok: false, error: data.error ?? "catalog_unavailable" };
      },
      {
        type: "object",
        properties: {
          slot: {
            type: "string",
            enum: slotIds,
            description: "Canvas slot the product belongs to.",
          },
          productId: {
            type: "string",
            description:
              "Known product ID, as returned by get_category_products.",
          },
        },
        required: ["slot", "productId"],
      },
    ),
    tool(
      "set_outfit_candidates",
      "Replace visible candidates for an outfit slot. Input: slot, productIds and rationale.",
      async (input) => {
        const slot = input.slot as Slot;
        const ids = input.productIds as string[];
        if (
          !slots.some((s) => s.id === slot) ||
          !Array.isArray(ids) ||
          ids.some((id) => !lookupProduct(id)) ||
          new Set(ids).size !== ids.length
        )
          return {
            ok: false,
            error: "Provide a valid slot and unique known product IDs.",
          };
        return write(
          "set_outfit_candidates",
          `${slot}: ${ids.join(", ")}`,
          (c) => ({
            ...c,
            activeSlot: slot,
            candidates: {
              ...c.candidates,
              [slot]: ids.filter((id) => !c.rejectedProductIds.includes(id)),
            },
            rationale: String(input.rationale ?? "Refined by your stylist."),
          }),
        );
      },
      {
        type: "object",
        properties: {
          slot: {
            type: "string",
            enum: slotIds,
            description: "Canvas slot to update candidates for.",
          },
          productIds: {
            type: "array",
            items: { type: "string" },
            description:
              "Unique, known product IDs to show as candidates, in order.",
          },
          rationale: {
            type: "string",
            description: "Shopper-facing explanation for this candidate set.",
          },
        },
        required: ["slot", "productIds"],
      },
    ),
    tool(
      "replace_outfit_item",
      "Replace an outfit item unless it has been locked by the shopper. Also used to place the first item into an empty slot — there is no separate add tool.",
      async (input) => {
        const slot = input.slot as Slot;
        const product = lookupProduct(String(input.productId));
        const current = getWorkspace().items.find((item) => item.slot === slot);
        if (
          !product ||
          !slots.some((s) => s.id === slot) ||
          slotFor(product.category) !== slot
        )
          return {
            ok: false,
            error: "Product is unknown or incompatible with this slot.",
          };
        if (current?.locked)
          return {
            ok: false,
            error: "Cannot replace this item: the shopper locked it.",
          };
        return write(
          "replace_outfit_item",
          `${slot} → ${product.name}`,
          (c) => ({
            ...c,
            items: [
              ...c.items.filter((item) => item.slot !== slot),
              { slot, productId: product.id, source: "agent", locked: false },
            ],
            explanation: String(input.reason ?? c.explanation),
          }),
        );
      },
      {
        type: "object",
        properties: {
          slot: {
            type: "string",
            enum: slotIds,
            description: "Canvas slot to fill or replace.",
          },
          productId: {
            type: "string",
            description: "Known product ID to place in this slot.",
          },
          reason: {
            type: "string",
            description: "Shopper-facing explanation for this choice.",
          },
        },
        required: ["slot", "productId"],
      },
    ),
    tool(
      "lock_outfit_item",
      "Mark an outfit item as human-approved and prevent future agent revisions from replacing it. Input: slot.",
      async (input) => {
        const slot = input.slot as Slot;
        if (
          !slots.some((s) => s.id === slot) ||
          !getWorkspace().items.some((i) => i.slot === slot)
        )
          return { ok: false, error: "There is no item to lock in that slot." };
        return write("lock_outfit_item", `Locked ${slot}`, (c) => ({
          ...c,
          items: c.items.map((i) =>
            i.slot === slot ? { ...i, locked: true } : i,
          ),
        }));
      },
      {
        type: "object",
        properties: {
          slot: {
            type: "string",
            enum: slotIds,
            description: "Canvas slot whose current item should be locked.",
          },
        },
        required: ["slot"],
      },
    ),
    tool(
      "set_outfit_constraint",
      "Update a shared shopping constraint such as budget, occasion, colour preference, formality or fit. Input: type and value.",
      async (input) => {
        const type = String(input.type ?? "");
        const value = String(input.value ?? "");
        if (
          !value ||
          !["budget", "occasion", "color", "formality", "fit"].includes(type)
        )
          return {
            ok: false,
            error:
              "Constraint type must be budget, occasion, color, formality or fit.",
          };
        return write("set_outfit_constraint", `${type}: ${value}`, (c) => ({
          ...c,
          budget: type === "budget" && Number(value) ? Number(value) : c.budget,
          occasion: type === "occasion" ? value : c.occasion,
          constraints:
            type === "budget" || type === "occasion"
              ? c.constraints
              : [
                  ...c.constraints.filter((x) => !x.startsWith(`${type}:`)),
                  `${type}: ${value}`,
                ],
        }));
      },
      {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["budget", "occasion", "color", "formality", "fit"],
            description: "Which constraint to update.",
          },
          value: {
            type: "string",
            description:
              "New value for the constraint (a number as a string for budget).",
          },
        },
        required: ["type", "value"],
      },
    ),
    tool(
      "explain_current_outfit",
      "Update the visible stylist explanation describing why the current outfit works and the trade-offs caused by human choices. Input: explanation.",
      async (input) => {
        const explanation = String(input.explanation ?? "");
        if (!explanation)
          return { ok: false, error: "An explanation is required." };
        return write(
          "explain_current_outfit",
          "Updated stylist explanation",
          (c) => ({ ...c, explanation }),
        );
      },
      {
        type: "object",
        properties: {
          explanation: {
            type: "string",
            description: "Shopper-facing rationale for the current outfit.",
          },
        },
        required: ["explanation"],
      },
    ),
    tool(
      "get_appointment_state",
      "Read the live fitting appointment state, mock stores, next-seven-day availability, selected slot, contact completion and confirmation status.",
      async () => {
        const current = getWorkspace();
        update((workspace) =>
          log(
            workspace,
            "read",
            "get_appointment_state",
            "Read live fitting appointment state",
          ),
        );
        return {
          appointment: current.appointment,
          stores,
          dates: appointmentDates,
          availableTimes:
            current.appointment.storeId && current.appointment.date
              ? slotsFor(current.appointment.storeId, current.appointment.date)
              : [],
        };
      },
    ),
    tool(
      "set_appointment_store",
      "Choose a mock fitting store. Input: storeId.",
      async (input) => {
        const storeId = String(input.storeId ?? "");
        if (!stores.some((store) => store.id === storeId))
          return { ok: false, error: "Choose a known mock store ID." };
        setShowAppointment(true);
        return write(
          "set_appointment_store",
          `Store: ${storeId}`,
          (workspace) => ({
            ...workspace,
            appointment: {
              ...workspace.appointment,
              storeId,
              date: "",
              time: "",
              confirmed: false,
            },
          }),
        );
      },
      {
        type: "object",
        properties: {
          storeId: {
            type: "string",
            enum: storeIds,
            description: "ID of the mock fitting store to reserve at.",
          },
        },
        required: ["storeId"],
      },
    ),
    tool(
      "set_appointment_slot",
      "Choose an available fitting date and timeslot within the next seven days. Input: date (YYYY-MM-DD), time (HH:MM).",
      async (input) => {
        const date = String(input.date ?? "");
        const time = String(input.time ?? "");
        const storeId = getWorkspace().appointment.storeId;
        if (!storeId)
          return {
            ok: false,
            error: "Choose a store before choosing a fitting slot.",
          };
        if (
          !appointmentDates.some((item) => item.value === date) ||
          !slotsFor(storeId, date).includes(time)
        )
          return {
            ok: false,
            error:
              "Choose an available time between 10:00 and 20:00 in the next seven days.",
          };
        setShowAppointment(true);
        return write(
          "set_appointment_slot",
          `${date} at ${time}`,
          (workspace) => ({
            ...workspace,
            appointment: {
              ...workspace.appointment,
              date,
              time,
              confirmed: false,
            },
          }),
        );
      },
      {
        type: "object",
        properties: {
          date: {
            type: "string",
            enum: dateValues,
            description:
              "Fitting date (YYYY-MM-DD) within the next seven days.",
          },
          time: {
            type: "string",
            pattern: "^[0-2][0-9]:[0-5][0-9]$",
            description:
              "Fitting time (HH:MM) available for the chosen store and date.",
          },
        },
        required: ["date", "time"],
      },
    ),
    tool(
      "set_appointment_contact",
      "Set fitting appointment contact details. Input: name, surname, phone, email, note (optional).",
      async (input) => {
        const name = String(input.name ?? "").trim();
        const surname = String(input.surname ?? "").trim();
        const phone = String(input.phone ?? "").trim();
        const email = String(input.email ?? "").trim();
        const note = String(input.note ?? "").trim();
        if (!name || !surname || !phone || !/^\S+@\S+\.\S+$/.test(email))
          return {
            ok: false,
            error: "Provide name, surname, phone and a valid email address.",
          };
        setShowAppointment(true);
        return write(
          "set_appointment_contact",
          `Contact: ${name} ${surname}`,
          (workspace) => ({
            ...workspace,
            appointment: {
              ...workspace.appointment,
              contact: { name, surname, phone, email },
              note,
              confirmed: false,
            },
          }),
        );
      },
      {
        type: "object",
        properties: {
          name: { type: "string", description: "Contact first name." },
          surname: { type: "string", description: "Contact surname." },
          phone: { type: "string", description: "Contact phone number." },
          email: {
            type: "string",
            format: "email",
            description: "Contact email address.",
          },
          note: {
            type: "string",
            description: "Optional note for the stylist.",
          },
        },
        required: ["name", "surname", "phone", "email"],
      },
    ),
    tool(
      "confirm_appointment",
      "Confirm the live mock fitting appointment after store, slot and full contact details are set.",
      async () => {
        const appointment = getWorkspace().appointment;
        if (
          !appointment.storeId ||
          !appointment.date ||
          !appointment.time ||
          !appointment.contact.name ||
          !appointment.contact.surname ||
          !appointment.contact.phone ||
          !/^\S+@\S+\.\S+$/.test(appointment.contact.email)
        )
          return {
            ok: false,
            error:
              "Complete store, date, time and contact details before confirming.",
          };
        setShowAppointment(true);
        return write(
          "confirm_appointment",
          `Confirmed ${appointment.date} at ${appointment.time}`,
          (workspace) => ({
            ...workspace,
            appointment: { ...workspace.appointment, confirmed: true },
          }),
        );
      },
    ),
    tool(
      "cancel_appointment",
      "Clear the current mock fitting appointment reservation.",
      async () => {
        setShowAppointment(true);
        return write(
          "cancel_appointment",
          "Appointment cancelled",
          (workspace) => ({
            ...workspace,
            appointment: { ...workspace.appointment, confirmed: false },
          }),
        );
      },
    ),
    tool(
      "generate_virtual_try_on",
      "Generate and display a virtual try-on image of the static editorial model wearing the current shared outfit. Reads the live canvas selection, occasion and budget. No photo upload is used.",
      async () => {
        const current = getWorkspace();
        const productIds = current.items.map((item) => item.productId);
        if (!productIds.length)
          return {
            ok: false,
            error:
              "Choose at least one outfit item before generating a virtual try-on.",
          };
        setShowTryOn(true);
        setTryOn({ status: "loading" });
        update((workspace) =>
          log(
            workspace,
            "write",
            "generate_virtual_try_on",
            "Generating a static-model try-on from the live canvas",
          ),
        );
        try {
          const response = await fetch("/api/try-on", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              productIds,
              products: tryOnProducts(current.items),
              occasion: current.occasion,
              budget: current.budget,
            }),
          });
          const data = (await response.json()) as {
            image?: string;
            error?: string;
          };
          if (!response.ok || !data.image)
            throw new Error(data.error ?? "No image was returned.");
          setTryOn({ status: "ready", image: data.image });
          update((workspace) =>
            log(
              workspace,
              "write",
              "generate_virtual_try_on",
              "Virtual try-on generated and displayed",
            ),
          );
          return {
            ok: true,
            message: "Virtual try-on generated and displayed in the canvas.",
          };
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Virtual try-on could not be generated.";
          setTryOn({ status: "error", error: message });
          update((workspace) =>
            log(
              workspace,
              "write",
              "generate_virtual_try_on",
              `Generation failed: ${message}`,
            ),
          );
          return { ok: false, error: message };
        }
      },
    ),
  ];
}
