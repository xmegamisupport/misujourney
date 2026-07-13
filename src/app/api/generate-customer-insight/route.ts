import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callOpenAiJsonSchema } from "@/lib/openai";
import { buildAIInsightPayload, buildCustomerTrendSummary, syncAttentionFlags } from "@/lib/insights/summary";
import { ANALYSIS_TYPE_DAYS } from "@/lib/insights/constants";
import type { AnalysisType } from "@/lib/insights/types";

export const runtime = "nodejs";

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string", description: "给 Coach 看的本周/两周总结，中性、非诊断性语气" },
    possible_factors: {
      type: "array",
      items: { type: "string" },
      description: "可能影响短期体重或执行情况的因素，必须使用「可能」「可能有关」等措辞，不写成确定因果",
    },
    positive_progress: { type: "array", items: { type: "string" }, description: "顾客做得好的地方" },
    coach_focus: { type: "array", items: { type: "string" }, description: "Coach 下一次跟进可以优先询问的内容，最多 3 项" },
    customer_message: { type: "string", description: "给顾客看的简单温和说明，不制造焦虑" },
    data_quality: { type: "string", enum: ["sufficient", "limited"] },
    medical_caution: { type: "boolean", description: "生病、长期无排便、或备注中出现明显身体不适时设为 true，这不是诊断，只是提醒 Coach 多留意" },
  },
  required: ["summary", "possible_factors", "positive_progress", "coach_focus", "customer_message", "data_quality", "medical_caution"],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `你是 MISU Journey 健康管理平台的顾客趋势分析助手。你只会看到系统整理好的结构化数据摘要（不是原始数据库记录），根据这份摘要生成给 Coach 和顾客看的简短说明。

摘要里包含：晨重记录、饮食打卡（211餐盘）、饮水完成度、MISU N+/DX+ 使用记录、睡前回顾中的排便次数与特殊情况（聚餐、外食较多、来月经、熬夜、生病、压力较大、出差、其他）、顾客备注摘要、以及已经由固定规则算出的关注标签。

必须遵守的限制：
- 只能做趋势整理和一般生活习惯提示，不能诊断疾病，不能判断顾客患有什么病，不能把体重变化归因于某种疾病，不能提供药物建议。
- 不能保证某个因素一定导致体重变化，只能描述「可能有关」的相关性，绝对不要把相关性写成确定因果。
- 不能因为体重上升批评顾客，不能因为没有打卡责备顾客，不能只根据一天的数据下结论。
- 文案必须使用「可能」「可能有关」「暂时观察」「从记录来看」「建议继续留意」等措辞，绝对避免「一定是因为」「证明你」「你没有认真」「你吃太多」「你代谢不好」等语气。
- 如果 data_quality 是 limited（资料不足），不要给出强结论，只需要说明资料还不够完整，继续观察。
- 如果摘要中 special_conditions.sick 大于 0，不要主动给减重建议，只建议以休息和恢复为主，并提醒如有明显不适应寻求专业医疗意见。
- 如果摘要中 special_conditions.menstruation 大于 0，提醒短期体重变化可能受身体水分变化影响，建议以后续几天的趋势作为参考。
- coach_focus 最多 3 项，简短可执行，例如：先了解外食较多的原因、询问目前饮水情况、鼓励继续记录排便、生理期期间先观察趋势、身体不适时优先关心恢复情况、不要因为单日体重变化过度调整计划。
- customer_message 给顾客看，语气温和、不制造焦虑，不要出现类似「连续3天无排便」这种可能让人担心的直接警告，只需要正向、简单的说明，如果资料不足就鼓励继续记录。
- medical_caution 在摘要明确出现生病、连续多天无排便、或备注中出现明显身体不适时设为 true——这不是诊断，只是提醒 Coach 多留意，不要在其他情况下设为 true。

只根据 JSON Schema 输出结果，不要输出多余文字。`;

interface RequestBody {
  customerId?: string;
  analysisType?: AnalysisType;
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "服务器未配置 OPENAI_API_KEY" }, { status: 500 });
  }

  const body = (await request.json()) as RequestBody;
  const customerId = body.customerId;
  const analysisType: AnalysisType = body.analysisType === "biweekly_14_day" ? "biweekly_14_day" : "weekly_7_day";

  if (!customerId) {
    return NextResponse.json({ error: "缺少 customerId" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user: caller },
  } = await supabase.auth.getUser();
  if (!caller) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  // Authorization piggybacks on the existing profiles RLS policies
  // (select_own / select_as_coach / select_as_admin) instead of
  // re-implementing the same rule here: if this query returns the target
  // row, the caller is either that customer, their assigned coach, or an
  // admin — exactly the three roles allowed to view/generate this insight.
  const { data: targetProfile } = await supabase.from("profiles").select("id").eq("id", customerId).maybeSingle();
  if (!targetProfile) {
    return NextResponse.json({ error: "无权限查看这位顾客的资料" }, { status: 403 });
  }

  // "已有当天摘要则直接读取，不要重复调用AI" — enforced again by the DB's
  // unique constraint on (customer_id, analysis_type, generated_date) below,
  // this is just the fast path that avoids the OpenAI call entirely.
  const today = new Date().toISOString().slice(0, 10);
  const { data: existing } = await supabase
    .from("customer_ai_insights")
    .select("*")
    .eq("customer_id", customerId)
    .eq("analysis_type", analysisType)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing && existing.generated_at.slice(0, 10) === today) {
    return NextResponse.json(existing);
  }

  const { data: goal } = await supabase
    .from("customer_goals")
    .select("water_target_ml")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const periodDays = ANALYSIS_TYPE_DAYS[analysisType];
  const summary = await buildCustomerTrendSummary(supabase, customerId, { periodDays, waterTargetMl: goal?.water_target_ml ?? 2000 });
  await syncAttentionFlags(supabase, customerId, summary);

  const payload = buildAIInsightPayload(summary);
  const aiResult = await callOpenAiJsonSchema<{
    summary: string;
    possible_factors: string[];
    positive_progress: string[];
    coach_focus: string[];
    customer_message: string;
    data_quality: "sufficient" | "limited";
    medical_caution: boolean;
  }>(
    apiKey,
    [
      { role: "system", content: [{ type: "input_text", text: SYSTEM_PROMPT }] },
      { role: "user", content: [{ type: "input_text", text: JSON.stringify(payload) }] },
    ],
    "customer_trend_insight",
    RESPONSE_SCHEMA,
  );

  if (!aiResult.ok || !aiResult.data) {
    return NextResponse.json({ error: aiResult.error, detail: aiResult.detail }, { status: 502 });
  }

  const { data: inserted, error: insertError } = await supabase
    .from("customer_ai_insights")
    .insert({
      customer_id: customerId,
      period_start: summary.period.startDate,
      period_end: summary.period.endDate,
      analysis_type: analysisType,
      summary: aiResult.data.summary,
      possible_factors: aiResult.data.possible_factors,
      positive_progress: aiResult.data.positive_progress,
      coach_focus: aiResult.data.coach_focus.slice(0, 3),
      customer_message: aiResult.data.customer_message,
      data_quality: aiResult.data.data_quality,
      medical_caution: aiResult.data.medical_caution,
      source_data: payload,
    })
    .select()
    .single();

  if (insertError) {
    // Unique-violation race: another concurrent request already generated
    // today's insight — return that one instead of erroring.
    if (insertError.code === "23505") {
      const { data: raceWinner } = await supabase
        .from("customer_ai_insights")
        .select("*")
        .eq("customer_id", customerId)
        .eq("analysis_type", analysisType)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (raceWinner) return NextResponse.json(raceWinner);
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json(inserted);
}
