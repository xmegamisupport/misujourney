import { NextResponse } from "next/server";
import { callOpenAiJsonSchema } from "@/lib/openai";
import { FOOD_CATEGORY_OPTIONS } from "@/lib/food-portions/constants";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FoodCategory } from "@/lib/food-portions/types";
import type { Json } from "@/lib/supabase/database.types";

const INBOX_IMAGE_BUCKET = "food-inbox-images";
// Quality proxy: a larger (sharper) compressed photo scores higher. ~500KB ≈ 1.0.
const QUALITY_REF_BYTES = 500 * 1024;

export const runtime = "nodejs";

interface EstimatedNutrition {
  calories: number;
  protein: number;
  carbohydrate: number;
  fat: number;
  fiber: number;
  servingG: number;
  servingName: string;
}

interface AiFoodItem {
  name: string;
  category: FoodCategory;
  dishName: string;
  confidence: number;
  recognitionType: string;
  aliases: string[] | null;
  components: { name: string; category: FoodCategory }[] | null;
  estimatedNutrition: EstimatedNutrition;
}

interface LibraryResolution {
  name: string;
  matched: boolean;
  missId?: string;
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
          recognitionType: {
            type: "string",
            enum: ["dish", "beverage", "packaged", "snack", "ingredient", "other"],
            description: "这个食物的类型",
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
          estimatedNutrition: {
            type: "object",
            description: "对这一份食物的营养『估算』（每一份）。系统会标示为 AI 估算；若食物库有官方数据会覆盖它。",
            properties: {
              calories: { type: "number", description: "每份大约热量 kcal" },
              protein: { type: "number", description: "每份蛋白质 g" },
              carbohydrate: { type: "number", description: "每份碳水 g" },
              fat: { type: "number", description: "每份脂肪 g" },
              fiber: { type: "number", description: "每份纤维 g" },
              servingG: { type: "number", description: "这一份大约多少克" },
              servingName: { type: "string", description: "份量说明，例如「1 碗」「1 盘」「1 杯」" },
            },
            required: ["calories", "protein", "carbohydrate", "fat", "fiber", "servingG", "servingName"],
            additionalProperties: false,
          },
        },
        required: ["name", "category", "dishName", "confidence", "recognitionType", "aliases", "components", "estimatedNutrition"],
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
   - recognitionType：这个食物的类型（dish/beverage/packaged/snack/ingredient/other）
   - aliases：这道菜的其他常见叫法/语言（可选，没有就 null）
   - components：组合菜的主要组成部分（可选，例如 Nasi Lemak = 白饭+炸鸡+花生；单一食物就 null）
   - estimatedNutrition：对这一份食物的营养**估算**（每份的 calories/protein/carbohydrate/fat/fiber，加上 servingG 与 servingName）。请尽量给出合理的常识性估算。这只是估算值，系统会明确标示为「AI 估算」；如果食物库里已有这道食物的官方数据，系统会自动用官方数据覆盖你的估算。

针对 MISU 产品**仍然绝对不要**估算任何营养数字（系统已有固定数据）——estimatedNutrition 只用于其他食物。

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
    const names = foodItems.map((f) => ({
      name: (f.dishName || f.name || "").trim(),
      confidence: f.confidence,
      recognitionType: f.recognitionType,
      firstSeenSource: "ai_photo",
      aliases: f.aliases,
      components: f.components,
      estimate: f.estimatedNutrition,
    }));
    if (names.length > 0) {
      const supabase = await createClient();
      const { data: resolved, error } = await supabase.rpc("food_resolve", { p_items: names as unknown as Json });
      const rows = resolved as unknown as LibraryResolution[] | null;
      if (!error && Array.isArray(rows) && rows.length === foodItems.length) {
        enriched = foodItems.map((f, i) => ({ ...f, library: rows[i] }));
      }
    }
  } catch {
    // Library unavailable — fall back to the AI-only result (today's behaviour).
  }

  // Smart Image Retention (Stage 1–3): capture the photo ONLY for misses, as a
  // review candidate, and immediately enforce the per-food cap. Entirely
  // best-effort + service-role; a failure here never affects the meal flow.
  try {
    const misses = enriched
      .map((f) => f.library)
      .filter((r): r is LibraryResolution => !!r && r.matched === false && typeof r.missId === "string");
    if (misses.length > 0) {
      const admin = createAdminClient();
      const buffer = Buffer.from(base64, "base64");
      const quality = Math.min(1, photo.size / QUALITY_REF_BYTES);
      const contentType = photo.type || "image/jpeg";
      for (const r of misses) {
        const path = `${r.missId}/${crypto.randomUUID()}.jpg`;
        const up = await admin.storage.from(INBOX_IMAGE_BUCKET).upload(path, buffer, { contentType, upsert: false });
        if (up.error) continue;
        const confidence = enriched.find((f) => f.library?.missId === r.missId)?.confidence ?? null;
        const { data: toDelete } = await admin.rpc("food_register_recognition_image", {
          p_miss_id: r.missId!,
          p_food_id: null,
          p_path: path,
          p_confidence: confidence,
          p_quality: quality,
        } as never);
        const paths = (toDelete as string[] | null) ?? [];
        if (paths.length > 0) {
          await admin.storage.from(INBOX_IMAGE_BUCKET).remove(paths);
          await admin.rpc("food_confirm_image_deleted", { p_paths: paths });
        }
      }
    }
  } catch {
    // Image capture/retention is best-effort — never blocks recognition.
  }

  return NextResponse.json({ ...data, foodItems: enriched });
}
