export const MEAL_ANALYSIS_MODEL = "gpt-5.6-terra";

interface OpenAiResponsePayload {
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
}

function extractOutputText(data: OpenAiResponsePayload): string | null {
  if (typeof data.output_text === "string" && data.output_text.length > 0) {
    return data.output_text;
  }
  const message = data.output?.find((item) => item.type === "message");
  const textItem = message?.content?.find((item) => item.type === "output_text" || item.type === "text");
  return textItem?.text ?? null;
}

export interface OpenAiJsonResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
  detail?: string;
}

/** Calls the Responses API with a JSON-schema-constrained output and parses the result. */
export async function callOpenAiJsonSchema<T>(
  apiKey: string,
  input: unknown[],
  schemaName: string,
  schema: object,
): Promise<OpenAiJsonResult<T>> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MEAL_ANALYSIS_MODEL,
      input,
      text: {
        format: {
          type: "json_schema",
          name: schemaName,
          strict: true,
          schema,
        },
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    return { ok: false, error: "OpenAI 请求失败", detail };
  }

  const data = (await response.json()) as OpenAiResponsePayload;
  const outputText = extractOutputText(data);
  if (!outputText) {
    return { ok: false, error: "未能解析模型返回内容" };
  }

  try {
    return { ok: true, data: JSON.parse(outputText) as T };
  } catch {
    return { ok: false, error: "模型返回内容不是合法 JSON", detail: outputText };
  }
}
