import { GoogleGenAI } from "@google/genai";
import { productById } from "../../catalog";

export const runtime = "nodejs";

type TryOnRequest = { productIds?: unknown; occasion?: unknown; budget?: unknown };

const allowedOccasions = new Set(["Everyday", "Dinner", "Client Meeting", "Wedding", "Weekend"]);
const sceneByOccasion: Record<string, string> = {
  "Everyday": "a quiet sunlit city street with warm stone architecture",
  "Dinner": "an intimate, warmly lit restaurant terrace at golden hour",
  "Client Meeting": "a calm contemporary office lobby with soft daylight and architectural lines",
  "Wedding": "an elegant garden reception with soft late-afternoon light",
  "Weekend": "a relaxed coastal café terrace with understated summer atmosphere",
};

export async function POST(request: Request) {
  let body: TryOnRequest;
  try { body = await request.json() as TryOnRequest; } catch { return Response.json({ error: "Send a JSON request body." }, { status: 400 }); }

  const ids = Array.isArray(body.productIds) ? [...new Set(body.productIds.filter((id): id is string => typeof id === "string"))] : [];
  if (ids.length < 1 || ids.length > 4) return Response.json({ error: "Select between one and four known outfit items." }, { status: 400 });
  const selected = ids.map(productById);
  if (selected.some((product) => !product)) return Response.json({ error: "One or more selected products are not in the catalog." }, { status: 400 });

  const occasion = typeof body.occasion === "string" && allowedOccasions.has(body.occasion) ? body.occasion : "Everyday";
  const budget = typeof body.budget === "number" && Number.isFinite(body.budget) && body.budget >= 100 && body.budget <= 5000 ? body.budget : 500;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return Response.json({ error: "Virtual try-on needs GEMINI_API_KEY in .env.local. Add it, then restart the server." }, { status: 503 });

  const garmentDescription = selected.map((product) => `${product!.name} (${product!.color}, ${product!.material}, ${product!.fit} fit)`).join("; ");
  const prompt = `Create a refined full-length fashion editorial photograph of one fictional adult model wearing this exact complete outfit: ${garmentDescription}. Occasion: ${occasion}. Budget context: €${budget}. Set the scene in ${sceneByOccasion[occasion]}. Use a natural confident pose, understated premium menswear campaign styling, realistic fabric texture and coherent lighting. The model is fully clothed. Preserve the specified garment colors and layers. No text, no typography, no logos, no product labels, no extra people, no collage.`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: prompt,
      config: { responseModalities: ["TEXT", "IMAGE"] },
    });
    const parts = (response.candidates?.flatMap((candidate) => candidate.content?.parts ?? []) ?? []) as Array<{ inlineData?: { data?: string; mimeType?: string } }>;
    const image = parts.find((part) => part.inlineData?.data && part.inlineData.mimeType?.startsWith("image/"))?.inlineData;
    if (!image?.data || !image.mimeType) return Response.json({ error: "Gemini did not return an image. Try again with a different outfit." }, { status: 502 });
    return Response.json({ image: `data:${image.mimeType};base64,${image.data}` });
  } catch (error) {
    console.error("Gemini virtual try-on failed", error);
    return Response.json({ error: "The virtual try-on could not be generated right now. Please try again." }, { status: 502 });
  }
}