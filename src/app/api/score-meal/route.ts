import { NextResponse } from "next/server";
import { callOpenAiJsonSchema } from "@/lib/openai";
import { PRODUCT_LABELS } from "@/lib/inventory/constants";
import { mealTypeLabel } from "@/lib/meal-types";
import type { ProductCode } from "@/lib/inventory/types";

export const runtime = "nodejs";

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    misuScore: { type: "number", description: "0-100 分，综合评估这餐对体重管理计划的适合程度" },
    goodPoints: {
      type: "array",
      items: { type: "string" },
      description: "最多 3 条，这餐做得好的地方，中文短句",
    },
    improvePoints: {
      type: "array",
      items: { type: "string" },
      description: "最多 3 条，这餐可以改善的地方，中文短句",
    },
  },
  required: ["misuScore", "goodPoints", "improvePoints"],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `你是 MISU Journey 健康管理平台的营养分析助手。用户会给你这一餐已确认的完整组成（MISU 产品数量与其他食物明细）以及算好的营养总量，请你据此给出 MISU Meal Score 评分与简短、温暖、鼓励性的中文反馈。只根据 JSON Schema 输出结果，不要输出多余文字。`;

interface ScoreMealBody {
  mealType?: string;
  misuItems?: { productCode: ProductCode; quantity: number }[];
  foodItems?: { name: string; servingLabel: string; quantity: number }[];
  totals?: { calories: number; protein: number; carbs: number; fat: number; fiber: number };
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "服务器未配置 OPENAI_API_KEY" }, { status: 500 });
  }

  const body = (await request.json()) as ScoreMealBody;
  const misuItems = body.misuItems ?? [];
  const foodItems = body.foodItems ?? [];
  const totals = body.totals ?? { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };

  const misuLines = misuItems
    .filter((m) => m.quantity > 0)
    .map((m) => `${PRODUCT_LABELS[m.productCode]} × ${m.quantity}`);
  const foodLines = foodItems
    .filter((f) => f.quantity > 0)
    .map((f) => `${f.name} × ${f.quantity}（${f.servingLabel}）`);

  const description = [
    `餐别：${mealTypeLabel(body.mealType ?? "")}`,
    misuLines.length > 0 ? `MISU 产品：${misuLines.join("、")}` : "MISU 产品：无",
    foodLines.length > 0 ? `其他食物：${foodLines.join("、")}` : "其他食物：无",
    `营养总量：热量 ${totals.calories}kcal，蛋白质 ${totals.protein}g，碳水 ${totals.carbs}g，脂肪 ${totals.fat}g，纤维 ${totals.fiber}g`,
  ].join("\n");

  const result = await callOpenAiJsonSchema(
    apiKey,
    [
      { role: "system", content: [{ type: "input_text", text: SYSTEM_PROMPT }] },
      { role: "user", content: [{ type: "input_text", text: description }] },
    ],
    "meal_score",
    RESPONSE_SCHEMA,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error, detail: result.detail }, { status: 502 });
  }

  return NextResponse.json(result.data);
}
