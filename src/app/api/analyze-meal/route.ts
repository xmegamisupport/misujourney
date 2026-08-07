import { NextResponse } from "next/server";
import { callOpenAiJsonSchema } from "@/lib/openai";
import { FOOD_CATEGORY_OPTIONS } from "@/lib/food-portions/constants";
import { createClient } from "@/lib/supabase/server";
import type { FoodCategory } from "@/lib/food-portions/types";

export const runtime = "nodejs";

interface AiFoodItem {
  name: string;
  category: FoodCategory;
  dishName: string;
  confidence: number;
  aliases: string[] | null;
  components: { name: string; category: FoodCategory }[] | null;
}

interface LibraryResolution {
  name: string;
  matched: boolean;
  foodId?: string;
  canonicalName?: string;
  plateCategory?: string | null;
  portion?: { gram: number; portionLabel: string; calories: number; protein: number; carbohydrate: number; fat: number; fiber: number };
}

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    misuDetected: {
      type: "array",
      description: "照片中出现的 MISU 产品，如果没有则为空数组",
      items: {
        type: "object",
        properties: {
          productCode: { type: "string", enum: ["MISU_N_PLUS", "MISU_DX_PLUS"] },
          quantityGuess: { type: "number", description: "估计的包数/条数" },
        },
        required: ["productCode", "quantityGuess"],
        additionalProperties: false,
      },
    },
    foodItems: {
      type: "array",
      description: "照片中除 MISU 产品以外的其他食物或饮品，如果没有则为空数组",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "简短中文食物名称，例如「白饭」「鸡胸肉」「地瓜叶」" },
          category: {
            type: "string",
            enum: FOOD_CATEGORY_OPTIONS,
            description: "这个食物最接近哪一种份量类别",
          },
          dishName: { type: "string", description: "更具体的菜名（若能辨认），例如「Nasi Lemak」「海南鸡饭」「Char Kuey Teow」；无法确定时可与 name 相同" },
          confidence: { type: "number", description: "对这个辨识结果的把握程度，0 到 1 之间" },
          aliases: {
            type: ["array", "null"],
            description: "这道菜的其他常见叫法/语言（可选），例如中文、马来文、英文名；没有就返回 null",
            items: { type: "string" },
          },
          components: {
            type: ["array", "null"],
            description: "组合菜的主要组成部分（可选），例如 Nasi Lemak = 白饭 + 炸鸡 + 花生；单一食物返回 null",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                category: { type: "string", enum: FOOD_CATEGORY_OPTIONS },
              },
              required: ["name", "category"],
              additionalProperties: false,
            },
          },
        },
        required: ["name", "category", "dishName", "confidence", "aliases", "components"],
        additionalProperties: false,
      },
    },
  },
  required: ["misuDetected", "foodItems"],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `你是 MISU Journey 健康管理平台的智能饮食辨识助手。你的任务分成两部分，请严格分开处理：

1. MISU 产品辨识：找出照片中出现的 MISU N+ 代餐或 MISU DX+ 排毒包装/冲泡包，估计大概的包数。**绝对不要**估算 MISU 产品的热量或营养数值——系统已经有固定的营养数据，你只需要负责判断有没有出现、出现几包。

2. 其他食物辨识：针对照片中除 MISU 以外的所有食物或饮品，逐一给出：
   - name：简短中文名称（例如「白饭」「鸡胸肉」「地瓜叶」）
   - category：从固定份量类别中选最接近的一个（rice=白饭类, noodle=面类, congee=粥, bread=面包, chicken=鸡肉, beef=牛肉, fish=鱼肉, egg=鸡蛋, vegetable=蔬菜, broccoli=花椰菜, fruit=水果, milk=牛奶, drink=饮料, fried=炸物, dessert=甜品）
   - dishName：更具体的菜名（若能认出），例如「Nasi Lemak」「海南鸡饭」「Char Kuey Teow」；不确定时可与 name 相同
   - confidence：你对这个辨识的把握，0 到 1
   - aliases：这道菜的其他常见叫法/语言（可选，没有就 null）
   - components：组合菜的主要组成部分（可选，例如 Nasi Lemak = 白饭+炸鸡+花生；单一食物就 null）

**你绝对不可以**：自行估算这些食物的克数、热量、蛋白质、碳水化合物、脂肪或纤维——系统会在用户选择生活化份量（例如「一碗」「一个手掌」）之后，从固定的营养数据库中查表计算，你完全不需要也不可以提供任何数字营养估算。

如果照片中没有 MISU 产品，misuDetected 返回空数组。如果没有其他食物，foodItems 返回空数组。

**非常重要**：如果这张照片里根本没有食物或饮品——例如是人物、宠物、风景、家具、文件、萤幕截图、空盘子或看不清楚的画面——请把两个数组都返回空数组，**绝对不要猜测或编造任何食物**。宁可返回空的结果，也不要凭空填入不存在的食物。系统会请用户重新拍照。

只根据 JSON Schema 输出结果，不要输出多余文字。`;

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "服务器未配置 OPENAI_API_KEY" }, { status: 500 });
  }

  const formData = await request.formData();
  const photo = formData.get("photo");
  const mealType = formData.get("mealType");

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
          { type: "input_text", text: `这是一份${mealType ?? ""}的照片，请辨识里面的 MISU 产品与其他食物，并为每一种食物选出份量类别。` },
          { type: "input_image", image_url: dataUrl, detail: "high" },
        ],
      },
    ],
    "meal_detection",
    RESPONSE_SCHEMA,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error, detail: result.detail }, { status: 502 });
  }

  const data = result.data as { misuDetected: unknown[]; foodItems: AiFoodItem[] };
  const foodItems = Array.isArray(data.foodItems) ? data.foodItems : [];

  // Recognition Adapter: resolve names against the Food Library. Entirely
  // best-effort — any failure (or an empty library) leaves foodItems exactly as
  // the AI returned them, so the meal flow behaves precisely as it does today.
  let enriched: (AiFoodItem & { library?: LibraryResolution })[] = foodItems;
  try {
    const names = foodItems.map((f) => ({ name: (f.dishName || f.name || "").trim(), confidence: f.confidence }));
    if (names.length > 0) {
      const supabase = await createClient();
      const { data: resolved, error } = await supabase.rpc("food_resolve", { p_items: names });
      const rows = resolved as unknown as LibraryResolution[] | null;
      if (!error && Array.isArray(rows) && rows.length === foodItems.length) {
        enriched = foodItems.map((f, i) => ({ ...f, library: rows[i] }));
      }
    }
  } catch {
    // Library unavailable — fall back to the AI-only result (today's behaviour).
  }

  return NextResponse.json({ ...data, foodItems: enriched });
}
