import { getProduct, isSlot } from "../../../shopify/storefront-mcp";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const slot = url.searchParams.get("slot") ?? "";
  const id = url.searchParams.get("id") ?? "";
  if (!isSlot(slot) || !id || id.length > 256)
    return Response.json({ error: "invalid_category" }, { status: 400 });
  try {
    return Response.json({
      source: "shopify",
      product: await getProduct(id, slot),
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error && error.message === "product_not_found"
            ? "product_not_found"
            : "catalog_unavailable",
      },
      {
        status:
          error instanceof Error && error.message === "product_not_found"
            ? 404
            : 502,
      },
    );
  }
}
