export type Slot = "top" | "bottom" | "shoes" | "accessory";
export type Category =
  | "overshirt"
  | "jacket"
  | "shirt"
  | "trousers"
  | "sneakers"
  | "loafers"
  | "accessories";
export type Product = {
  id: string;
  name: string;
  category: Category;
  price: number;
  color: string;
  style: string[];
  formality: number;
  fit: string;
  material: string;
  image: string;
  description?: string;
  scenes?: string[];
};

export const slotFor = (category: Category): Slot =>
  category === "trousers"
    ? "bottom"
    : ["sneakers", "loafers"].includes(category)
      ? "shoes"
      : category === "accessories"
        ? "accessory"
        : "top";

export const products: Product[] = [];

export const productById = (id?: string) =>
  products.find((product) => product.id === id);
export const initialCandidates: Record<Slot, string[]> = {
  top: [],
  bottom: [],
  shoes: [],
  accessory: [],
};
