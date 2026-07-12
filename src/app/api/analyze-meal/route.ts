import { NextResponse } from "next/server";
import { callOpenAiJsonSchema } from "@/lib/openai";

export const runtime = "nodejs";

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
          name: { type: "string", description: "简短中文食物名称，例如「低脂牛奶」「鸡蛋」「香蕉」" },
          servingLabel: { type: "string", description: "一份的份量描述，例如「1杯(约250ml)」「1颗」「1根」" },
          quantityGuess: { type: "number", description: "估计的份数" },
          caloriesPerUnit: { type: "number", description: "每一份的热量，单位 kcal" },
          proteinPerUnit: { type: "number", description: "每一份的蛋白质，单位 g" },
          carbsPerUnit: { type: "number", description: "每一份的碳水化合物，单位 g" },
          fatPerUnit: { type: "number", description: "每一份的脂肪，单位 g" },
          fiberPerUnit: { type: "number", description: "每一份的膳食纤维，单位 g" },
        },
        required: [
          "name",
          "servingLabel",
          "quantityGuess",
          "caloriesPerUnit",
          "proteinPerUnit",
          "carbsPerUnit",
          "fatPerUnit",
          "fiberPerUnit",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["misuDetected", "foodItems"],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `你是 MISU Journey 健康管理平台的智能饮食辨识助手。你的任务分成两部分，请严格分开处理：

1. MISU 产品辨识：找出照片中出现的 MISU N+ 代餐或 MISU DX+ 排毒包装/冲泡包，估计大概的包数。**绝对不要**估算 MISU 产品的热量或营养数值——系统已经有固定的营养数据，你只需要负责判断有没有出现、出现几包。

2. 其他食物辨识：针对照片中除 MISU 以外的所有食物或饮品，逐一给出简短中文名称、常见的一份份量描述、估计份数，以及每一份的营养估算（热量、蛋白质、碳水化合物、脂肪、膳食纤维）。

如果照片中没有 MISU 产品，misuDetected 返回空数组。如果没有其他食物，foodItems 返回空数组。只根据 JSON Schema 输出结果，不要输出多余文字。`;

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
          { type: "input_text", text: `这是一份${mealType ?? ""}的照片，请辨识里面的 MISU 产品与其他食物。` },
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

  return NextResponse.json(result.data);
}
