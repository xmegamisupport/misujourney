import { NextResponse } from "next/server";
import { callOpenAiJsonSchema } from "@/lib/openai";
import { verifyLabel } from "@/lib/nutrition-label/verify";
import type { NutritionLabelReading } from "@/lib/nutrition-label/types";

export const runtime = "nodejs";

/** Reading a printed panel is OCR, not estimation.
 *
 * Everywhere else in this app the vision model is forbidden from producing
 * nutrition numbers, because guessing "this rice is 180g" is worse than a
 * standard portion. A nutrition panel inverts that: the manufacturer measured
 * it and printed it, so the number on the packet beats any lookup table we
 * could ever build. The rule is not "never trust the model with numbers" — it
 * is "never let it invent numbers". Transcribing is allowed; inventing is not,
 * and the schema below says so explicitly.
 */

const NUTRIENT_PROPS = {
  type: "object",
  properties: {
    calories: { type: "number", description: "热量 kcal" },
    protein: { type: "number", description: "蛋白质 g" },
    carbohydrate: { type: "number", description: "碳水化合物 g" },
    fat: { type: "number", description: "脂肪 g" },
    fiber: { type: "number", description: "膳食纤维 g，表上没有就填 0" },
  },
  required: ["calories", "protein", "carbohydrate", "fat", "fiber"],
  additionalProperties: false,
} as const;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    readable: { type: "boolean", description: "照片里是否有清楚可读的营养成分表" },
    productName: { type: "string", description: "产品名称，看不到就填空字串" },
    brand: { type: "string", description: "品牌，看不到就填空字串" },
    servingSizeG: { type: "number", description: "每一份的公克数（Saiz Hidangan / Serving Size）" },
    servingsPerPackage: { type: "number", description: "每包装含几份（Servings Per Package）；没有标示就填 1" },
    per100g: NUTRIENT_PROPS,
    perServing: NUTRIENT_PROPS,
  },
  required: ["readable", "productName", "brand", "servingSizeG", "servingsPerPackage", "per100g", "perServing"],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `你是营养成分表的转录助手。你的工作是**照抄**照片里印的数字，不是估算。

马来西亚的包装通常同时印两栏：「Setiap 100g / Per 100g」和「Setiap Hidangan / Per Serving」。

**最重要的规则**：
1. 你必须分别读出这两栏，**绝对不可以混淆**。per100g 只能填「每 100 克」那一栏的数字，perServing 只能填「每一份」那一栏的数字。
2. 如果表上只有一栏，请从那一栏和份量重量自行换算出另一栏，务必保持两栏在数学上一致。
3. servingSizeG 是「Saiz Hidangan / Serving Size」的公克数，例如「20 g」就填 20。
4. servingsPerPackage 是「Bilangan Hidangan / Servings Per Package」，例如「1」就填 1；没有标示就填 1。
5. 膳食纤维（Serabut Diet / Dietary Fibre）如果表上没有，填 0。
6. 单位如果是 kJ 不是 kcal，请换算成 kcal（1 kcal = 4.184 kJ）后再填。

**你绝对不可以猜测或编造任何数字。** 如果照片模糊、角度太斜、表格不完整、或根本不是营养成分表，请把 readable 设为 false，其余栏位填 0 或空字串。宁可回报读不到，也不要给出不确定的数字——系统会请用户重新拍照。`;

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "服务器未配置 OPENAI_API_KEY" }, { status: 500 });
  }

  const formData = await request.formData();
  const photo = formData.get("photo");
  if (!(photo instanceof File)) {
    return NextResponse.json({ error: "缺少照片文件" }, { status: 400 });
  }

  const bytes = await photo.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const dataUrl = `data:${photo.type || "image/jpeg"};base64,${base64}`;

  const result = await callOpenAiJsonSchema(
    apiKey,
    [
      { role: "system", content: [{ type: "input_text", text: SYSTEM_PROMPT }] },
      {
        role: "user",
        content: [
          { type: "input_text", text: "这是一张食品包装的营养成分表照片，请照抄上面的数字。" },
          { type: "input_image", image_url: dataUrl, detail: "high" },
        ],
      },
    ],
    "nutrition_label",
    RESPONSE_SCHEMA,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error, detail: result.detail }, { status: 502 });
  }

  const data = result.data as NutritionLabelReading & { readable: boolean };

  if (!data.readable) {
    return NextResponse.json({ error: "没有读到清楚的营养成分表，请对准表格再拍一次。" }, { status: 422 });
  }

  // The same check runs here as well as in the browser. A reading that fails
  // its own arithmetic must never reach the customer, and server-side is the
  // one place that cannot be skipped.
  const verdict = verifyLabel(data);
  if (!verdict.ok) {
    return NextResponse.json({ error: verdict.reason }, { status: 422 });
  }

  return NextResponse.json(data);
}
