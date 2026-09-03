"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fetchCatalogSlot, generateTryOnImage } from "./api-client";
import { productById, Product, Slot, slotFor } from "./catalog";
import { Canvas } from "./components/Canvas";
import { CandidateStudio } from "./components/CandidateStudio";
import { GeneratedLookModal } from "./components/GeneratedLookModal";
import { Navigation } from "./components/Navigation";
import { StylistPanel } from "./components/StylistPanel";
import { WorkspaceDrawers } from "./components/WorkspaceDrawers";
import { registerWebMcpTools } from "./webmcp/tools";
import {
  blank,
  log,
  OutfitItem,
  slots,
  ToolPreview,
  Workspace,
} from "./workspace";

const chatGptUrl = (() => {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_CHATGPT_URL ?? "");
    const localHttp =
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
    return url.protocol === "https:" || localHttp ? url.toString() : undefined;
  } catch {
    return undefined;
  }
})();

export default function Home() {
  const [state, setState] = useState<Workspace>(blank);
  const [drawer, setDrawer] = useState<"activity" | "tools" | null>(null);
  const [toolList, setToolList] = useState<ToolPreview[]>([]);
  const activityTrigger = useRef<HTMLButtonElement>(null);
  const toolsTrigger = useRef<HTMLButtonElement>(null);
  const [tryOn, setTryOn] = useState<{
    status: "idle" | "loading" | "ready" | "error";
    image?: string;
    error?: string;
  }>({ status: "idle" });
  const [showTryOn, setShowTryOn] = useState(false);
  const [showAppointment, setShowAppointment] = useState(false);
  const [showLookModal, setShowLookModal] = useState(false);
  const [shopifyRegistry, setShopifyRegistry] = useState<
    Record<string, Product>
  >({});
  const [catalogStatus, setCatalogStatus] = useState<
    "loading" | "ready" | "empty" | "unavailable"
  >("loading");
  const shopifyRegistryRef = useRef(shopifyRegistry);
  shopifyRegistryRef.current = shopifyRegistry;
  const lookupProduct = (id?: string) =>
    id
      ? (shopifyRegistryRef.current[id] ??
        shopifyRegistryRef.current[`shopify:${id}`] ??
        productById(id))
      : undefined;
  const live = useRef(state);
  live.current = state;
  const update = (recipe: (current: Workspace) => Workspace) =>
    setState((current) => recipe(current));
  const human = (action: string, recipe: (current: Workspace) => Workspace) =>
    update((current) =>
      log(
        {
          ...recipe(current),
          revision: current.revision + 1,
          lastHumanAction: action,
        },
        "human",
        "shopper action",
        action,
      ),
    );
  const visibleCandidateIds =
    catalogStatus === "empty"
      ? []
      : state.candidates[state.activeSlot].filter((id) =>
          lookupProduct(id)?.scenes?.includes(state.occasion.toLowerCase()),
        );
  const total = useMemo(
    () =>
      state.items.reduce(
        (sum, item) => sum + (lookupProduct(item.productId)?.price ?? 0),
        0,
      ),
    [state.items, shopifyRegistry],
  );

  const addToCanvas = (id: string, product: Product, slot: Slot) =>
    human(`Human selected ${product.name}`, (current) => ({
      ...current,
      activeSlot: slot,
      items: [
        ...current.items.filter((item) => item.slot !== slot),
        { slot, productId: id, source: "human", locked: false },
      ],
    }));
  const selectProduct = (id: string) => {
    const product = lookupProduct(id);
    if (!product) return;
    addToCanvas(id, product, slotFor(product.category));
  };
  const tryOnProducts = (items: OutfitItem[]) =>
    items
      .map((item) => lookupProduct(item.productId))
      .filter((product): product is Product => Boolean(product))
      .map((product) => ({
        name: product.name,
        description: product.description,
        image: product.image,
      }));
  const lock = (slot: Slot) =>
    human(
      `Human locked ${slots.find((item) => item.id === slot)?.label}`,
      (current) => ({
        ...current,
        items: current.items.map((item) =>
          item.slot === slot ? { ...item, locked: !item.locked } : item,
        ),
      }),
    );
  useEffect(() => {
    let cancelled = false;
    const categoryBySlot: Record<Slot, Product["category"]> = {
      top: "shirt",
      bottom: "trousers",
      shoes: "sneakers",
      accessory: "accessories",
    };
    const load = async () => {
      setCatalogStatus("loading");
      try {
        const entries = await Promise.all(
          slots.map(
            async ({ id }) => [id, await fetchCatalogSlot(id)] as const,
          ),
        );
        if (cancelled) return;
        const registry: Record<string, Product> = {};
        const candidates: Record<Slot, string[]> = {
          top: [],
          bottom: [],
          shoes: [],
          accessory: [],
        };
        for (const [slot, products] of entries)
          for (const card of products) {
            const id = `shopify:${card.id}`;
            registry[id] = {
              id,
              name: card.title,
              category: categoryBySlot[slot],
              price: (card.price?.amountMinor ?? 0) / 100,
              color: "Shopify",
              style: ["live catalog"],
              formality: 3,
              fit: "See options",
              material: card.productType ?? "Shopify catalog",
              image: card.image ?? "",
              description: card.description,
              scenes: card.scenes,
            };
            candidates[slot].push(id);
          }
        setShopifyRegistry(registry);
        update((current) => ({
          ...current,
          candidates,
          rationale: "Live product selection from your Shopify store.",
        }));
        setCatalogStatus(
          entries.some(([, products]) => products.length) ? "ready" : "empty",
        );
      } catch {
        if (!cancelled) {
          update((current) => ({
            ...current,
            candidates: { top: [], bottom: [], shoes: [], accessory: [] },
          }));
          setCatalogStatus("unavailable");
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (!drawer) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      const closing = drawer;
      setDrawer(null);
      requestAnimationFrame(() =>
        (closing === "activity"
          ? activityTrigger
          : toolsTrigger
        ).current?.focus(),
      );
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [drawer]);

  useEffect(() => {
    const tools = registerWebMcpTools({
      getWorkspace: () => live.current,
      update,
      lookupProduct,
      tryOnProducts,
      setShowTryOn,
      setTryOn,
      setShowAppointment,
      setShowLookModal,
    });
    setToolList(tools.map(({ name, description }) => ({ name, description })));
    const modelContext = document.modelContext;
    if (!modelContext?.registerTool) return;
    try {
      tools.forEach((entry) => modelContext.registerTool!(entry));
      update((current) =>
        tools.reduce(
          (workspace, entry) =>
            log(workspace, "write", "tool registered", entry.name),
          current,
        ),
      );
    } catch {
      // Registration failure leaves the page usable without WebMCP tools.
    }
  }, []);

  const generateTryOn = async () => {
    const productIds = state.items.map((item) => item.productId);
    if (!productIds.length) {
      setTryOn({
        status: "error",
        error: "Choose at least one piece on the canvas first.",
      });
      return;
    }
    setTryOn({ status: "loading" });
    try {
      const image = await generateTryOnImage({
        productIds,
        products: tryOnProducts(state.items),
        occasion: state.occasion,
        budget: state.budget,
      });
      setTryOn({ status: "ready", image });
    } catch (error) {
      setTryOn({
        status: "error",
        error:
          error instanceof Error
            ? error.message
            : "Virtual try-on could not be generated.",
      });
    }
  };

  return (
    <main>
      <div className="grain" />
      <Navigation onReset={() => setState(blank())} />
      <section id="workspace" className="workspace">
        <StylistPanel
          occasion={state.occasion}
          lastHumanAction={state.lastHumanAction}
          budget={state.budget}
          human={human}
        />
        <div className="workbench">
          <CandidateStudio
            activeSlot={state.activeSlot}
            catalogStatus={catalogStatus}
            visibleCandidateIds={visibleCandidateIds}
            lookupProduct={lookupProduct}
            update={update}
            selectProduct={selectProduct}
          />
          <Canvas
            items={state.items}
            activeSlot={state.activeSlot}
            budget={state.budget}
            total={total}
            lookupProduct={lookupProduct}
            update={update}
            human={human}
            lock={lock}
            setShowTryOn={setShowTryOn}
            setShowAppointment={setShowAppointment}
            setTryOn={setTryOn}
            setShowLookModal={setShowLookModal}
            generateTryOn={generateTryOn}
            showTryOn={showTryOn}
            tryOn={tryOn}
            showAppointment={showAppointment}
            appointment={state.appointment}
          />
        </div>
      </section>
      <WorkspaceDrawers
        drawer={drawer}
        setDrawer={setDrawer}
        activity={state.activity}
        tools={toolList}
        chatGptUrl={chatGptUrl}
        activityTrigger={activityTrigger}
        toolsTrigger={toolsTrigger}
      />
      <GeneratedLookModal
        show={showLookModal}
        image={tryOn.image}
        items={state.items}
        lookupProduct={lookupProduct}
        onClose={() => setShowLookModal(false)}
      />
      <div aria-live="polite" className="sr-only">
        {state.lastHumanAction ?? state.explanation}
      </div>
    </main>
  );
}
