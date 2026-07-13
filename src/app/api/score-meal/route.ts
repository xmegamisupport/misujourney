import { NextResponse } from "next/server";
import { callOpenAiJsonSchema } from "@/lib/openai";
import { PRODUCT_LABELS } from "@/lib/inventory/constants";
import { mealTypeLabel } from "@/lib/meal-types";
import type { ProductCode } from "@/lib/inventory/types";

export const runtime = "nodejs";

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    advice: {
      type: "string",
      description: "一句温暖、鼓励性的中文建议，根据 211 比例给出具体但不苛责的下一步小提示",
    },
  },
  required: ["advice"],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `你是 MISU Journey 健康管理平台的营养分析助手。系统已经用固定规则算好这一餐的 211 餐盘比例（蔬菜/蛋白质/主食）与评分，你不需要也不可以重新计算或推翻这些数字。你的任务只是根据系统给的比例与说明，写一句简短、温暖、鼓励性的中文建议，帮助用户知道下一步可以怎么微调（例如「青菜再增加半份会更加均衡」）。不要提及具体克数或热量数字，只根据 JSON Schema 输出结果，不要输出多余文字。`;

interface ScoreMealBody {
  mealType?: string;
  misuItems?: { productCode: ProductCode; quantity: number }[];
  foodItems?: { name: string; category: string; portionLabel: string }[];
  plateAnalysis?: { vegetablePercent: number; proteinPercent: number; carbPercent: number };
  goodPoints?: string[];
  improvePoints?: string[];
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "服务器未配置 OPENAI_API_KEY" }, { status: 500 });
  }

  const body = (await request.json()) as ScoreMealBody;
  const misuItems = body.misuItems ?? [];
  const foodItems = body.foodItems ?? [];
  const plateAnalysis = body.plateAnalysis ?? { vegetablePercent: 0, proteinPercent: 0, carbPercent: 0 };

  const misuLines = misuItems.filter((m) => m.quantity > 0).map((m) => `${PRODUCT_LABELS[m.productCode]} × ${m.quantity}`);
  const foodLines = foodItems.map((f) => `${f.name}（${f.portionLabel}）`);

  const description = [
    `餐别：${mealTypeLabel(body.mealType ?? "")}`,
    misuLines.length > 0 ? `MISU 产品：${misuLines.join("、")}` : "MISU 产品：无",
    foodLines.length > 0 ? `其他食物：${foodLines.join("、")}` : "其他食物：无",
    `211 比例（系统已算好，不需重新计算）：蔬菜 ${plateAnalysis.vegetablePercent}%，蛋白质 ${plateAnalysis.proteinPercent}%，主食 ${plateAnalysis.carbPercent}%`,
    body.goodPoints && body.goodPoints.length > 0 ? `系统判断做得好的地方：${body.goodPoints.join("、")}` : "",
    body.improvePoints && body.improvePoints.length > 0 ? `系统判断可以改善的地方：${body.improvePoints.join("、")}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const result = await callOpenAiJsonSchema<{ advice: string }>(
    apiKey,
    [
      { role: "system", content: [{ type: "input_text", text: SYSTEM_PROMPT }] },
      { role: "user", content: [{ type: "input_text", text: description }] },
    ],
    "meal_advice",
    RESPONSE_SCHEMA,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error, detail: result.detail }, { status: 502 });
  }

  return NextResponse.json(result.data);
}
