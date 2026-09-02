export type Slot = "top" | "bottom" | "shoes" | "accessory";
export type Category = "overshirt" | "jacket" | "shirt" | "trousers" | "sneakers" | "loafers" | "accessories";
export type Product = { id: string; name: string; category: Category; price: number; color: string; style: string[]; formality: number; fit: string; material: string; image: string };

export const slotFor = (category: Category): Slot => category === "trousers" ? "bottom" : ["sneakers", "loafers"].includes(category) ? "shoes" : category === "accessories" ? "accessory" : "top";

export const products: Product[] = [
  ["cream-linen-overshirt","Cream Linen Overshirt","overshirt",168,"Cream",["italian summer","relaxed","tonal"],3,"Relaxed","Linen"],
  ["structured-sand-jacket","Structured Sand Jacket","jacket",295,"Sand",["tailored","smart casual"],5,"Regular","Cotton twill"],
  ["navy-wool-overshirt","Navy Wool Overshirt","overshirt",220,"Navy",["smart casual","textured"],4,"Relaxed","Wool blend"],
  ["olive-field-jacket","Olive Field Jacket","jacket",260,"Olive",["utility","casual"],3,"Relaxed","Cotton"],
  ["chalk-popover-shirt","Chalk Popover Shirt","shirt",132,"Chalk",["summer","minimal"],4,"Regular","Cotton poplin"],
  ["blue-stripe-shirt","Blue Stripe Shirt","shirt",145,"Blue",["classic","office"],5,"Regular","Oxford cotton"],
  ["ecru-knit-polo","Ecru Knit Polo","shirt",118,"Ecru",["relaxed","resort"],3,"Relaxed","Cotton knit"],
  ["dark-olive-pleated-trouser","Dark Olive Pleated Trouser","trousers",175,"Olive",["italian summer","tailored","relaxed"],5,"Relaxed","Cotton linen"],
  ["stone-relaxed-trouser","Stone Relaxed Trouser","trousers",150,"Stone",["summer","tonal"],3,"Relaxed","Linen blend"],
  ["navy-drawstring-trouser","Navy Drawstring Trouser","trousers",138,"Navy",["casual","resort"],2,"Relaxed","Linen"],
  ["tobacco-chino","Tobacco Chino","trousers",125,"Tobacco",["smart casual","classic"],4,"Tapered","Cotton"],
  ["charcoal-wool-trouser","Charcoal Wool Trouser","trousers",198,"Charcoal",["office","tailored"],6,"Regular","Tropical wool"],
  ["white-leather-sneaker","White Leather Sneaker","sneakers",145,"White",["minimal","casual"],2,"Regular","Leather"],
  ["brown-suede-loafer","Brown Suede Loafer","loafers",210,"Brown",["smart casual","italian summer"],6,"Regular","Suede"],
  ["black-minimal-loafer","Black Minimal Loafer","loafers",225,"Black",["formal","minimal"],7,"Regular","Leather"],
  ["sand-canvas-sneaker","Sand Canvas Sneaker","sneakers",98,"Sand",["casual","summer"],2,"Regular","Canvas"],
  ["espresso-penny-loafer","Espresso Penny Loafer","loafers",240,"Espresso",["office","classic"],7,"Regular","Leather"],
  ["ivory-silk-scarf","Ivory Silk Scarf","accessories",76,"Ivory",["refined","tonal"],5,"One size","Silk"],
  ["cognac-belt","Cognac Leather Belt","accessories",68,"Cognac",["classic","smart casual"],5,"One size","Leather"],
  ["tortoise-sunglasses","Tortoise Sunglasses","accessories",112,"Tortoise",["summer","editorial"],4,"One size","Acetate"],
  ["olive-silk-pocket-square","Olive Silk Pocket Square","accessories",54,"Olive",["tailored","tonal"],6,"One size","Silk"],
  ["canvas-weekender","Canvas Weekender","accessories",155,"Natural",["weekend","utility"],3,"One size","Canvas"],
  ["black-ribbed-tank","Black Ribbed Tank","shirt",66,"Black",["minimal","layering"],2,"Slim","Cotton"],
  ["soft-grey-harrington","Soft Grey Harrington","jacket",235,"Grey",["minimal","transitional"],4,"Regular","Cotton"],
].map(([id,name,category,price,color,style,formality,fit,material]) => ({ id: id as string, name: name as string, category: category as Category, price: price as number, color: color as string, style: style as string[], formality: formality as number, fit: fit as string, material: material as string, image: `/products/${id}.svg` }));

export const productById = (id?: string) => products.find((product) => product.id === id);
export const initialCandidates: Record<Slot, string[]> = {
  top: ["cream-linen-overshirt", "structured-sand-jacket", "navy-wool-overshirt", "chalk-popover-shirt"],
  bottom: ["dark-olive-pleated-trouser", "stone-relaxed-trouser", "tobacco-chino", "navy-drawstring-trouser"],
  shoes: ["white-leather-sneaker", "brown-suede-loafer", "sand-canvas-sneaker", "black-minimal-loafer"],
  accessory: ["cognac-belt", "tortoise-sunglasses", "ivory-silk-scarf", "olive-silk-pocket-square"],
};
