"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { initialCandidates, productById, Slot, slotFor, Product } from "./catalog";
import type { CatalogCard } from "./shopify/storefront-mcp";
import { WorkspaceDrawers } from "./components/WorkspaceDrawers";
import { defineWebMcpTool } from "./webmcp/tool-definition";

type OutfitItem = { slot: Slot; productId: string; source: "human" | "agent"; locked: boolean };
type Activity = { at: string; direction: "read" | "write" | "human"; name: string; detail: string };
type ToolPreview = { name: string; description: string };
type Appointment = { storeId: string; date: string; time: string; contact: { name: string; surname: string; phone: string; email: string }; note: string; confirmed: boolean };
const stores = [{ id: "amsterdam", name: "De Bijenkorf Studio", city: "Amsterdam", address: "Dam 1" }, { id: "rotterdam", name: "Maison West", city: "Rotterdam", address: "Meent 78" }, { id: "utrecht", name: "Canal House Fitting", city: "Utrecht", address: "Oudegracht 112" }];
const appointmentDates = Array.from({ length: 7 }, (_, index) => { const date = new Date(); date.setHours(12, 0, 0, 0); date.setDate(date.getDate() + index); return { value: date.toISOString().slice(0, 10), label: new Intl.DateTimeFormat("en-NL", { weekday: "short", day: "numeric", month: "short" }).format(date) }; });
const slotsFor = (storeId: string, date: string) => { const day = appointmentDates.findIndex((item) => item.value === date); return ["10:00", "11:30", "13:00", "14:30", "16:00", "17:30", "19:00"].filter((_, index) => (index + Math.max(day, 0) + storeId.length) % 4 !== 0); };
type Workspace = { items: OutfitItem[]; budget: number; occasion: string; constraints: string[]; rejectedProductIds: string[]; candidates: Record<Slot, string[]>; rationale: string; explanation: string; lastHumanAction: string | null; revision: number; activeSlot: Slot; activity: Activity[]; appointment: Appointment };
const slots: { id: Slot; label: string; note: string }[] = [{ id: "top", label: "Upper layer", note: "An effortless opening line" }, { id: "bottom", label: "Trousers", note: "The silhouette anchor" }, { id: "shoes", label: "Footwear", note: "Where the occasion shifts" }, { id: "accessory", label: "Finishing touch", note: "A little intention" }];
const blank = (): Workspace => ({ items: [], budget: 500, occasion: "Everyday", constraints: ["Relaxed silhouette", "Neutral palette"], rejectedProductIds: [], candidates: initialCandidates, rationale: "A tonal starting point for relaxed Italian summer.", explanation: "Your choices set the direction.", lastHumanAction: null, revision: 0, activeSlot: "top", activity: [], appointment: { storeId: "", date: "", time: "", contact: { name: "", surname: "", phone: "", email: "" }, note: "", confirmed: false } });
const money = (value: number) => new Intl.NumberFormat("en-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
const chatGptUrl = (() => {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_CHATGPT_URL ?? "");
    const localHttp = url.protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
    return url.protocol === "https:" || localHttp ? url.toString() : undefined;
  } catch { return undefined; }
})();

export default function Home() {
  const [state, setState] = useState<Workspace>(blank);
  const [drawer, setDrawer] = useState<"activity" | "tools" | null>(null);
  const [toolList, setToolList] = useState<ToolPreview[]>([]);
  const activityTrigger = useRef<HTMLButtonElement>(null);
  const toolsTrigger = useRef<HTMLButtonElement>(null);
  const [webMcp, setWebMcp] = useState<"checking" | "ready" | "unavailable">("checking");
  const [tryOn, setTryOn] = useState<{ status: "idle" | "loading" | "ready" | "error"; image?: string; error?: string }>({ status: "idle" });
  const [showTryOn, setShowTryOn] = useState(false);
  const [showAppointment, setShowAppointment] = useState(false);
  const [showLookModal, setShowLookModal] = useState(false);
  const [shopifyRegistry, setShopifyRegistry] = useState<Record<string, Product>>({});
  const [catalogStatus, setCatalogStatus] = useState<"loading" | "ready" | "empty" | "unavailable">("loading");
  const lookupProduct = (id?: string) => id ? shopifyRegistry[id] ?? productById(id) : undefined;
  const live = useRef(state); live.current = state;
  const update = (recipe: (current: Workspace) => Workspace) => setState((current) => recipe(current));
  const log = (current: Workspace, direction: Activity["direction"], name: string, detail: string): Workspace => ({ ...current, activity: [{ at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }), direction, name, detail }, ...current.activity].slice(0, 18) });
  const human = (action: string, recipe: (current: Workspace) => Workspace) => update((current) => log({ ...recipe(current), revision: current.revision + 1, lastHumanAction: action }, "human", "shopper action", action));
  const visibleCandidateIds = catalogStatus === "empty" ? [] : state.candidates[state.activeSlot].filter((id) => lookupProduct(id)?.scenes?.includes(state.occasion.toLowerCase()));
  const total = useMemo(() => state.items.reduce((sum, item) => sum + (lookupProduct(item.productId)?.price ?? 0), 0), [state.items, shopifyRegistry]);

  const addToCanvas = (id: string, product: Product, slot: Slot) => human(`Human selected ${product.name}`, (current) => ({ ...current, activeSlot: slot, items: [...current.items.filter((item) => item.slot !== slot), { slot, productId: id, source: "human", locked: false }] }));
  const selectProduct = (id: string) => {
    const product = lookupProduct(id); if (!product) return;
    addToCanvas(id, product, slotFor(product.category));
  };
  const tryOnProducts = (items: OutfitItem[]) => items.map((item) => lookupProduct(item.productId)).filter((product): product is Product => Boolean(product)).map((product) => ({ name: product.name, color: product.color, material: product.material, fit: product.fit, image: product.image }));
  const lock = (slot: Slot) => human(`Human locked ${slots.find((item) => item.id === slot)?.label}`, (current) => ({ ...current, items: current.items.map((item) => item.slot === slot ? { ...item, locked: !item.locked } : item) }));
  const reject = (id: string) => { const p = lookupProduct(id); if (!p) return; human(`Human rejected ${p.name}`, (current) => ({ ...current, rejectedProductIds: [...new Set([...current.rejectedProductIds, id])], candidates: { ...current.candidates, [slotFor(p.category)]: current.candidates[slotFor(p.category)].filter((candidate) => candidate !== id) } })); };

  useEffect(() => {
    let cancelled = false;
    const categoryBySlot: Record<Slot, Product["category"]> = { top: "shirt", bottom: "trousers", shoes: "sneakers", accessory: "accessories" };
    const load = async () => {
      setCatalogStatus("loading");
      try {
        const entries = await Promise.all(slots.map(async ({ id }) => { const response = await fetch(`/api/catalog?slot=${id}`); const data = await response.json() as { products?: CatalogCard[] }; if (!response.ok || !data.products) throw new Error("catalog_unavailable"); return [id, data.products] as const; }));
        if (cancelled) return;
        const registry: Record<string, Product> = {}; const candidates: Record<Slot, string[]> = { top: [], bottom: [], shoes: [], accessory: [] };
        for (const [slot, products] of entries) for (const card of products) { const id = `shopify:${card.id}`; registry[id] = { id, name: card.title, category: categoryBySlot[slot], price: (card.price?.amountMinor ?? 0) / 100, color: "Shopify", style: ["live catalog"], formality: 3, fit: "See options", material: card.productType ?? "Shopify catalog", image: card.image ?? "", scenes: card.scenes }; candidates[slot].push(id); }
        setShopifyRegistry(registry); update((current) => ({ ...current, candidates, rationale: "Live product selection from your Shopify store." })); setCatalogStatus(entries.some(([, products]) => products.length) ? "ready" : "empty");
      } catch { if (!cancelled) { update((current) => ({ ...current, candidates: { top: [], bottom: [], shoes: [], accessory: [] } })); setCatalogStatus("unavailable"); } }
    };
    void load(); return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (!drawer) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      const closing = drawer; setDrawer(null);
      requestAnimationFrame(() => (closing === "activity" ? activityTrigger : toolsTrigger).current?.focus());
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [drawer]);

  useEffect(() => {
    const read = () => ({ ...live.current, activity: undefined });
    const write = (name: string, detail: string, recipe: (current: Workspace) => Workspace) => {
      update((current) => log({ ...recipe(current), revision: current.revision + 1 }, "write", name, detail));
      return { ok: true, revision: live.current.revision + 1 };
    };
    const tool = defineWebMcpTool;
    const tools = [
      tool("get_outfit_state", "Read the current shared outfit workspace, including human-selected items, AI picks, locked pieces, rejected products, budget, occasion, constraints, last human action and revision.", async () => { update((c) => log(c, "read", "get_outfit_state", `Read shared workspace at revision ${c.revision}`)); return read(); }),
      tool("get_visible_candidates", "Read the products currently visible in the candidate area, including IDs, prices, categories and recommendation status.", async () => { const c = live.current; update((x) => log(x, "read", "get_visible_candidates", `Read ${c.candidates[c.activeSlot].length} visible ${c.activeSlot} candidates`)); return c.candidates[c.activeSlot].map((id) => lookupProduct(id)).filter(Boolean); }),
      tool("get_shopify_category_products", "Read every currently available Shopify product for a canvas slot. Input: slot (top, bottom, shoes, accessory).", async (input) => {
        const slot = String(input.slot ?? ""); if (!slots.some((item) => item.id === slot)) return { ok: false, error: "Provide a valid canvas slot." };
        const response = await fetch(`/api/catalog?slot=${slot}`); const data = await response.json(); update((current) => log(current, "read", "get_shopify_category_products", `Read Shopify products for ${slot}`)); return response.ok ? data : { ok: false, error: data.error ?? "catalog_unavailable" };
      }),
      tool("get_shopify_product_details", "Read normalized Shopify product details for a canvas slot. Input: slot and productId.", async (input) => {
        const slot = String(input.slot ?? ""); const productId = String(input.productId ?? ""); if (!slots.some((item) => item.id === slot) || !productId || productId.length > 256) return { ok: false, error: "Provide a valid slot and product ID." };
        const response = await fetch(`/api/catalog/product?slot=${slot}&id=${encodeURIComponent(productId)}`); const data = await response.json(); update((current) => log(current, "read", "get_shopify_product_details", `Read Shopify product details`)); return response.ok ? data : { ok: false, error: data.error ?? "catalog_unavailable" };
      }),      tool("set_outfit_candidates", "Replace visible candidates for an outfit slot. Input: slot, productIds and rationale.", async (input) => { const slot = input.slot as Slot; const ids = input.productIds as string[]; if (!slots.some((s) => s.id === slot) || !Array.isArray(ids) || ids.some((id) => !lookupProduct(id)) || new Set(ids).size !== ids.length) return { ok: false, error: "Provide a valid slot and unique known product IDs." }; return write("set_outfit_candidates", `${slot}: ${ids.join(", ")}`, (c) => ({ ...c, activeSlot: slot, candidates: { ...c.candidates, [slot]: ids.filter((id) => !c.rejectedProductIds.includes(id)) }, rationale: String(input.rationale ?? "Refined by your stylist.") })); }),
      tool("replace_outfit_item", "Replace an outfit item unless it has been locked by the shopper. Input: slot, productId, reason.", async (input) => { const slot = input.slot as Slot; const product = lookupProduct(String(input.productId)); const current = live.current.items.find((item) => item.slot === slot); if (!product || !slots.some((s) => s.id === slot) || slotFor(product.category) !== slot) return { ok: false, error: "Product is unknown or incompatible with this slot." }; if (current?.locked) return { ok: false, error: "Cannot replace this item: the shopper locked it." }; return write("replace_outfit_item", `${slot} → ${product.name}`, (c) => ({ ...c, items: [...c.items.filter((item) => item.slot !== slot), { slot, productId: product.id, source: "agent", locked: false }], explanation: String(input.reason ?? c.explanation) })); }),
      tool("lock_outfit_item", "Mark an outfit item as human-approved and prevent future agent revisions from replacing it. Input: slot.", async (input) => { const slot = input.slot as Slot; if (!slots.some((s) => s.id === slot) || !live.current.items.some((i) => i.slot === slot)) return { ok: false, error: "There is no item to lock in that slot." }; return write("lock_outfit_item", `Locked ${slot}`, (c) => ({ ...c, items: c.items.map((i) => i.slot === slot ? { ...i, locked: true } : i) })); }),
      tool("set_outfit_constraint", "Update a shared shopping constraint such as budget, occasion, colour preference, formality or fit. Input: type and value.", async (input) => { const type = String(input.type ?? ""); const value = String(input.value ?? ""); if (!value || !["budget", "occasion", "color", "formality", "fit"].includes(type)) return { ok: false, error: "Constraint type must be budget, occasion, color, formality or fit." }; return write("set_outfit_constraint", `${type}: ${value}`, (c) => ({ ...c, budget: type === "budget" && Number(value) ? Number(value) : c.budget, occasion: type === "occasion" ? value : c.occasion, constraints: type === "budget" || type === "occasion" ? c.constraints : [...c.constraints.filter((x) => !x.startsWith(`${type}:`)), `${type}: ${value}`] })); }),
      tool("explain_current_outfit", "Update the visible stylist explanation describing why the current outfit works and the trade-offs caused by human choices. Input: explanation.", async (input) => { const explanation = String(input.explanation ?? ""); if (!explanation) return { ok: false, error: "An explanation is required." }; return write("explain_current_outfit", "Updated stylist explanation", (c) => ({ ...c, explanation })); }),
      tool("get_appointment_state", "Read the live fitting appointment state, mock stores, next-seven-day availability, selected slot, contact completion and confirmation status.", async () => {
        const current = live.current;
        update((workspace) => log(workspace, "read", "get_appointment_state", "Read live fitting appointment state"));
        return { appointment: current.appointment, stores, dates: appointmentDates, availableTimes: current.appointment.storeId && current.appointment.date ? slotsFor(current.appointment.storeId, current.appointment.date) : [] };
      }),
      tool("set_appointment_store", "Choose a mock fitting store. Input: storeId.", async (input) => {
        const storeId = String(input.storeId ?? "");
        if (!stores.some((store) => store.id === storeId)) return { ok: false, error: "Choose a known mock store ID." };
        return write("set_appointment_store", `Store: ${storeId}`, (workspace) => ({ ...workspace, appointment: { ...workspace.appointment, storeId, date: "", time: "", confirmed: false } }));
      }),
      tool("set_appointment_slot", "Choose an available fitting date and timeslot within the next seven days. Input: date (YYYY-MM-DD), time (HH:MM).", async (input) => {
        const date = String(input.date ?? ""); const time = String(input.time ?? ""); const storeId = live.current.appointment.storeId;
        if (!storeId) return { ok: false, error: "Choose a store before choosing a fitting slot." };
        if (!appointmentDates.some((item) => item.value === date) || !slotsFor(storeId, date).includes(time)) return { ok: false, error: "Choose an available time between 10:00 and 20:00 in the next seven days." };
        return write("set_appointment_slot", `${date} at ${time}`, (workspace) => ({ ...workspace, appointment: { ...workspace.appointment, date, time, confirmed: false } }));
      }),
      tool("set_appointment_contact", "Set fitting appointment contact details. Input: name, surname, phone, email, note (optional).", async (input) => {
        const name = String(input.name ?? "").trim(); const surname = String(input.surname ?? "").trim(); const phone = String(input.phone ?? "").trim(); const email = String(input.email ?? "").trim(); const note = String(input.note ?? "").trim();
        if (!name || !surname || !phone || !/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: "Provide name, surname, phone and a valid email address." };
        return write("set_appointment_contact", `Contact: ${name} ${surname}`, (workspace) => ({ ...workspace, appointment: { ...workspace.appointment, contact: { name, surname, phone, email }, note, confirmed: false } }));
      }),
      tool("confirm_appointment", "Confirm the live mock fitting appointment after store, slot and full contact details are set.", async () => {
        const appointment = live.current.appointment;
        if (!appointment.storeId || !appointment.date || !appointment.time || !appointment.contact.name || !appointment.contact.surname || !appointment.contact.phone || !/^\S+@\S+\.\S+$/.test(appointment.contact.email)) return { ok: false, error: "Complete store, date, time and contact details before confirming." };
        return write("confirm_appointment", `Confirmed ${appointment.date} at ${appointment.time}`, (workspace) => ({ ...workspace, appointment: { ...workspace.appointment, confirmed: true } }));
      }),
      tool("cancel_appointment", "Clear the current mock fitting appointment reservation.", async () => write("cancel_appointment", "Appointment cancelled", (workspace) => ({ ...workspace, appointment: { ...workspace.appointment, confirmed: false } }))),      tool("generate_virtual_try_on", "Generate and display a virtual try-on image of the static editorial model wearing the current shared outfit. Reads the live canvas selection, occasion and budget. No photo upload is used.", async () => {
        const current = live.current;
        const productIds = current.items.map((item) => item.productId);
        if (!productIds.length) return { ok: false, error: "Choose at least one outfit item before generating a virtual try-on." };
        setShowTryOn(true);
        setTryOn({ status: "loading" });
        update((workspace) => log(workspace, "write", "generate_virtual_try_on", "Generating a static-model try-on from the live canvas"));
        try {
          const response = await fetch("/api/try-on", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productIds, products: tryOnProducts(current.items), occasion: current.occasion, budget: current.budget }) });
          const data = await response.json() as { image?: string; error?: string };
          if (!response.ok || !data.image) throw new Error(data.error ?? "No image was returned.");
          setTryOn({ status: "ready", image: data.image });
          update((workspace) => log(workspace, "write", "generate_virtual_try_on", "Virtual try-on generated and displayed"));
          return { ok: true, message: "Virtual try-on generated and displayed in the canvas." };
        } catch (error) {
          const message = error instanceof Error ? error.message : "Virtual try-on could not be generated.";
          setTryOn({ status: "error", error: message });
          update((workspace) => log(workspace, "write", "generate_virtual_try_on", `Generation failed: ${message}`));
          return { ok: false, error: message };
        }
      }),
    ];
    setToolList(tools.map(({ name, description }) => ({ name, description })));
    const modelContext = document.modelContext;
    if (!modelContext?.registerTool) { setWebMcp("unavailable"); return; }
    try { tools.forEach((entry) => modelContext.registerTool!(entry)); update((current) => tools.reduce((workspace, entry) => log(workspace, "write", "tool registered", entry.name), current)); setWebMcp("ready"); } catch { setWebMcp("unavailable"); }
  }, []);

  const generateTryOn = async () => {
    const productIds = state.items.map((item) => item.productId);
    if (!productIds.length) { setTryOn({ status: "error", error: "Choose at least one piece on the canvas first." }); return; }
    setTryOn({ status: "loading" });
    try {
      const response = await fetch("/api/try-on", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productIds, products: tryOnProducts(state.items), occasion: state.occasion, budget: state.budget }) });
      const data = await response.json() as { image?: string; error?: string };
      if (!response.ok || !data.image) throw new Error(data.error ?? "No image was returned.");
      setTryOn({ status: "ready", image: data.image });
    } catch (error) { setTryOn({ status: "error", error: error instanceof Error ? error.message : "Virtual try-on could not be generated." }); }
  };

  return <main>
    <div className="grain" />
    <nav><a className="mark" href="#top">M/ <i>mine</i></a><div className="navlinks"><a href="#workspace">Workspace</a><a href="#candidates">Candidates</a><a href="#how">How it works</a></div><button className="reset" onClick={() => setState(blank())}>Demo reset <span>↺</span></button></nav>
    <section id="top" className="hero"><div className="herointro"><p className="eyebrow">THE SHARED WORKSPACE</p><h1>Your look,<br /><em>your decisions.</em></h1><div className="status"><span className={webMcp === "ready" ? "dot ready" : "dot"} /> {webMcp === "ready" ? "WebMCP connected — live workspace available" : webMcp === "checking" ? "Checking stylist connection…" : "WebMCP ready when opened in a supported browser"}</div></div><div className="quickguide"><p className="eyebrow">HOW TO USE IT</p><ol><li><b>01</b><span><strong>Build your starting look</strong>Start with a candidate or a stylist pick.</span></li><li><b>02</b><span><strong>Make it yours</strong>Lock what works. Change what does not.</span></li><li><b>03</b><span><strong>Let the stylist adapt</strong>It adapts around every choice you keep.</span></li></ol></div></section>
    <section id="workspace" className="workspace">      <aside className="stylist"><p className="eyebrow">YOUR STYLIST</p><div className="portrait">S<span>✦</span></div><h2>Stylist<br /><em>notes.</em></h2><blockquote>“{state.explanation}”</blockquote><div className="context"><span>OCCASION</span><strong>{state.occasion}</strong><span>LAST SIGNAL</span><strong>{state.lastHumanAction ?? "Waiting for your first move"}</strong></div><div className="occasion"><p>Set the scene</p>{["Everyday", "Office"].map((item) => <button key={item} className={state.occasion === item ? "selected" : ""} onClick={() => human(`Human changed occasion to ${item}`, (c) => ({ ...c, occasion: item }))}>{item}</button>)}</div><label className="budget">Budget <output>{money(state.budget)}</output><input aria-label="Outfit budget" type="range" min="300" max="700" step="25" value={state.budget} onChange={(e) => human(`Human changed budget to ${money(Number(e.target.value))}`, (c) => ({ ...c, budget: Number(e.target.value) }))} /></label></aside><div className="workbench"><section id="candidates" className="candidates"><div className="candidatehead"><div><p className="eyebrow">CURATED FOR THE CANVAS</p><h2>Candidate studio</h2><p>{state.rationale}</p></div><div className="tabs">{slots.map((slot) => <button key={slot.id} onClick={() => update((c) => ({ ...c, activeSlot: slot.id }))} className={state.activeSlot === slot.id ? "selected" : ""}>{slot.label}</button>)}</div></div>{catalogStatus !== "ready" && <div className="catalogstatus">{catalogStatus === "loading" ? "Loading products…" : catalogStatus === "empty" ? "No products available." : "Products are unavailable."}</div>}<div className="productgrid">{visibleCandidateIds.filter((id) => !state.rejectedProductIds.includes(id)).map((id, index) => { const product = lookupProduct(id); if (!product) return null; return <article className="product" key={id} style={{ animationDelay: `${index * 70}ms` }}><div className={`productart ${product.color.toLowerCase().replace(" ", "-")}`}><span>{product.category}</span>{product.image ? <img className="productimage" src={product.image} alt={product.name} onError={(event) => { event.currentTarget.style.display = "none"; }} /> : <div className="garment" />}</div><div className="productmeta"><p>{product.color} · {product.material}</p><h3>{product.name}</h3><strong>{product.price ? money(product.price) : "View details"}</strong></div><div className="productactions"><button onClick={() => selectProduct(id)}>Add to canvas <span>↗</span></button><button aria-label={`Reject ${product.name}`} className="reject" onClick={() => reject(id)}>Not this</button></div></article> })}</div></section><div className="canvas"><div className="sectionhead"><div><p className="eyebrow">THE OUTFIT</p><h2>Shared canvas</h2></div><div className="canvasheadcontrols"><span className="revision">LIVE STATE · REV {state.revision}</span><button className="emptycanvas" onClick={() => { human("Human emptied the canvas", (c) => ({ ...c, items: [], appointment: { ...c.appointment, confirmed: false } })); setShowTryOn(false); setShowAppointment(false); setTryOn({ status: "idle" }); }}>Empty canvas</button></div></div><div className="slotgrid">{slots.map((slot) => { const item = state.items.find((x) => x.slot === slot.id); const product = lookupProduct(item?.productId); return <article className={`slot ${item ? "filled" : ""} ${state.activeSlot === slot.id ? "active" : ""}`} key={slot.id} onClick={() => update((c) => ({ ...c, activeSlot: slot.id }))}><div className="slotnum">0{slots.indexOf(slot) + 1}</div>{product ? <><div className={`swatch ${product.color.toLowerCase().replace(" ", "-")}`}>{product.image && <img src={product.image} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} />}</div><div className="slotcopy"><p>{slot.label}</p><h3>{product.name}</h3><span>{product.material} · {product.price ? money(product.price) : "Price on selection"}</span></div><div className="badges"><b className={item?.source === "human" ? "human" : "agent"}>{item?.source === "human" ? "YOUR CHOICE" : "AI PICK"}</b>{item?.locked && <b className="locked">⌁ LOCKED BY YOU</b>}</div><button aria-label={`${item?.locked ? "Unlock" : "Lock"} ${product.name}`} className="lock" onClick={(e) => { e.stopPropagation(); lock(slot.id); }}>{item?.locked ? "Unlock" : "Keep this"}</button></> : <><div className="emptyline" /><div className="slotcopy"><p>{slot.label}</p><h3>Open for an idea</h3><span>{slot.note}</span></div></>}</article>})}</div><div className="total"><span>Outfit total</span><strong className={total > state.budget ? "over" : ""}>{money(total)}</strong><small>of {money(state.budget)}</small></div><div className="canvasactions"><button disabled={state.items.length < 2} onClick={() => { human("Human requested virtual try-on", (c) => ({ ...c })); setShowTryOn(true); generateTryOn(); }}>Generate my look</button><button disabled={state.items.length < 2} onClick={() => { human("Human opened in-store fitting reservation", (c) => ({ ...c })); setShowAppointment(true); }}>I want to try this in-store</button></div>{showTryOn && <section className="tryon"><div className="tryonhead"><div><p className="eyebrow">VIRTUAL FIT</p><h3>{tryOn.status === "loading" ? "Styling your look…" : "Your look on."}</h3></div><button onClick={generateTryOn} disabled={tryOn.status === "loading"}>Generate again</button></div><div className="modelstage">{tryOn.status === "ready" && tryOn.image ? <button className="expandlook" onClick={() => setShowLookModal(true)} aria-label="Open generated look in full size"><img src={tryOn.image} alt="AI-generated static model wearing the selected outfit" /><span>Open full look ↗</span></button> : <><div className="modelshape"><i /><b /><span /></div>{tryOn.status === "loading" && <div className="generating">Building your look <em>✦</em></div>}</>}</div><div className="tryonitems">{state.items.length ? state.items.map((item) => <span key={item.slot}>{lookupProduct(item.productId)?.name}</span>) : <span>Your selected pieces will appear here.</span>}</div>{tryOn.status === "error" && <p className="tryonerror">{tryOn.error}</p>}<p className="tryonnote">Static model · No image upload required</p></section>}{showAppointment && <section className="appointment"><div className="appointmenthead"><div><p className="eyebrow">IN-STORE FITTING</p><h3>Reserve a fitting.</h3></div>{state.appointment.confirmed && <b>CONFIRMED</b>}</div><div className="bookingstep"><label>01 / Store<select value={state.appointment.storeId} onChange={(e) => human(`Human selected ${stores.find((store) => store.id === e.target.value)?.name ?? "a store"}`, (c) => ({ ...c, appointment: { ...c.appointment, storeId: e.target.value, date: "", time: "", confirmed: false } }))}><option value="">Choose a store</option>{stores.map((store) => <option key={store.id} value={store.id}>{store.name} · {store.city}</option>)}</select></label></div><div className="bookingstep"><label>02 / Date<div className="datepills">{appointmentDates.map((date) => <button key={date.value} disabled={!state.appointment.storeId} className={state.appointment.date === date.value ? "selected" : ""} onClick={() => human(`Human selected fitting date ${date.label}`, (c) => ({ ...c, appointment: { ...c.appointment, date: date.value, time: "", confirmed: false } }))}>{date.label}</button>)}</div></label>{state.appointment.date && <div className="timepills">{slotsFor(state.appointment.storeId, state.appointment.date).map((time) => <button key={time} className={state.appointment.time === time ? "selected" : ""} onClick={() => human(`Human selected fitting time ${time}`, (c) => ({ ...c, appointment: { ...c.appointment, time, confirmed: false } }))}>{time}</button>)}</div>}</div><div className="bookingstep contactform"><p>03 / Contact details</p><input aria-label="First name" placeholder="First name" value={state.appointment.contact.name} onChange={(e) => human("Human entered first name", (c) => ({ ...c, appointment: { ...c.appointment, contact: { ...c.appointment.contact, name: e.target.value }, confirmed: false } }))} /><input aria-label="Surname" placeholder="Surname" value={state.appointment.contact.surname} onChange={(e) => human("Human entered surname", (c) => ({ ...c, appointment: { ...c.appointment, contact: { ...c.appointment.contact, surname: e.target.value }, confirmed: false } }))} /><input aria-label="Phone number" placeholder="Phone number" value={state.appointment.contact.phone} onChange={(e) => human("Human entered phone number", (c) => ({ ...c, appointment: { ...c.appointment, contact: { ...c.appointment.contact, phone: e.target.value }, confirmed: false } }))} /><input aria-label="Email address" placeholder="Email address" type="email" value={state.appointment.contact.email} onChange={(e) => human("Human entered email", (c) => ({ ...c, appointment: { ...c.appointment, contact: { ...c.appointment.contact, email: e.target.value }, confirmed: false } }))} /><textarea aria-label="Appointment note" placeholder="A note for your stylist (optional)" value={state.appointment.note} onChange={(e) => human("Human added fitting note", (c) => ({ ...c, appointment: { ...c.appointment, note: e.target.value, confirmed: false } }))} /></div><button className="confirmappointment" disabled={!state.appointment.storeId || !state.appointment.date || !state.appointment.time || !state.appointment.contact.name || !state.appointment.contact.surname || !state.appointment.contact.phone || !/^\S+@\S+\.\S+$/.test(state.appointment.contact.email)} onClick={() => human("Human confirmed fitting appointment", (c) => ({ ...c, appointment: { ...c.appointment, confirmed: true } }))}>{state.appointment.confirmed ? "Appointment reserved" : "Reserve my fitting"}</button>{state.appointment.confirmed && <p className="appointmentsummary">{stores.find((store) => store.id === state.appointment.storeId)?.name} · {appointmentDates.find((date) => date.value === state.appointment.date)?.label} at {state.appointment.time}</p>}</section>}</div></div></section>    <section id="how" className="how"><p className="eyebrow">THE SHARED-STATE LOOP</p><div><span>01 / YOU EDIT</span><span>02 / STYLIST READS</span><span>03 / LOOK EVOLVES</span></div><p>Every lock, selection, rejection, occasion, and budget update belongs to the same visible workspace your connected stylist can read and revise.</p></section>
    <WorkspaceDrawers drawer={drawer} setDrawer={setDrawer} activity={state.activity} tools={toolList} chatGptUrl={chatGptUrl} activityTrigger={activityTrigger} toolsTrigger={toolsTrigger} />{showLookModal && tryOn.image && <div className="lookoverlay" role="dialog" aria-modal="true" aria-label="Generated virtual try-on"><button className="overlaybackdrop" aria-label="Close enlarged look" onClick={() => setShowLookModal(false)} /><div className="lookmodal"><button className="closelook" onClick={() => setShowLookModal(false)}>Close ×</button><img src={tryOn.image} alt="Full-size AI-generated static model wearing the selected outfit" /><div className="lookmodalfooter"><div><p className="eyebrow">THE LOOK</p><h2>Canvas, brought to life.</h2></div><div className="lookmodalitems">{state.items.map((item) => <span key={item.slot}><b>{item.slot}</b>{lookupProduct(item.productId)?.name}</span>)}</div></div></div></div>}
    <div aria-live="polite" className="sr-only">{state.lastHumanAction ?? state.explanation}</div>
  </main>;
}
