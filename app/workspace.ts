import { Slot, initialCandidates } from "./catalog";

export type OutfitItem = {
  slot: Slot;
  productId: string;
  source: "human" | "agent";
  locked: boolean;
};
export type Activity = {
  at: string;
  direction: "read" | "write" | "human";
  name: string;
  detail: string;
};
export type ToolPreview = { name: string; description: string };
export type Appointment = {
  storeId: string;
  date: string;
  time: string;
  contact: { name: string; surname: string; phone: string; email: string };
  note: string;
  confirmed: boolean;
};
export type Workspace = {
  items: OutfitItem[];
  budget: number;
  occasion: string;
  constraints: string[];
  candidates: Record<Slot, string[]>;
  rationale: string;
  explanation: string;
  lastHumanAction: string | null;
  revision: number;
  activeSlot: Slot;
  activity: Activity[];
  appointment: Appointment;
};
export type TryOnState = {
  status: "idle" | "loading" | "ready" | "error";
  image?: string;
  error?: string;
};
export type TryOnProductPayload = {
  name: string;
  description?: string;
  image: string;
};

export const stores = [
  {
    id: "amsterdam",
    name: "De Bijenkorf Studio",
    city: "Amsterdam",
    address: "Dam 1",
  },
  {
    id: "rotterdam",
    name: "Maison West",
    city: "Rotterdam",
    address: "Meent 78",
  },
  {
    id: "utrecht",
    name: "Canal House Fitting",
    city: "Utrecht",
    address: "Oudegracht 112",
  },
];

export const appointmentDates = Array.from({ length: 7 }, (_, index) => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + index);
  return {
    value: date.toISOString().slice(0, 10),
    label: new Intl.DateTimeFormat("en-NL", {
      weekday: "short",
      day: "numeric",
      month: "short",
    }).format(date),
  };
});

export const slotsFor = (storeId: string, date: string) => {
  const day = appointmentDates.findIndex((item) => item.value === date);
  return ["10:00", "11:30", "13:00", "14:30", "16:00", "17:30", "19:00"].filter(
    (_, index) => (index + Math.max(day, 0) + storeId.length) % 4 !== 0,
  );
};

export const slots: { id: Slot; label: string; note: string }[] = [
  { id: "top", label: "Upper layer", note: "An effortless opening line" },
  { id: "bottom", label: "Trousers", note: "The silhouette anchor" },
  { id: "shoes", label: "Footwear", note: "Where the occasion shifts" },
  { id: "accessory", label: "Finishing touch", note: "A little intention" },
];

export const blank = (): Workspace => ({
  items: [],
  budget: 500,
  occasion: "Everyday",
  constraints: ["Relaxed silhouette", "Neutral palette"],
  candidates: initialCandidates,
  rationale: "A tonal starting point for relaxed Italian summer.",
  explanation: "Your choices set the direction.",
  lastHumanAction: null,
  revision: 0,
  activeSlot: "top",
  activity: [],
  appointment: {
    storeId: "",
    date: "",
    time: "",
    contact: { name: "", surname: "", phone: "", email: "" },
    note: "",
    confirmed: false,
  },
});

export const money = (value: number) =>
  new Intl.NumberFormat("en-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);

/** Appends an activity entry and trims the log to the visible window. */
export const log = (
  current: Workspace,
  direction: Activity["direction"],
  name: string,
  detail: string,
): Workspace => ({
  ...current,
  activity: [
    {
      at: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      direction,
      name,
      detail,
    },
    ...current.activity,
  ].slice(0, 18),
});
