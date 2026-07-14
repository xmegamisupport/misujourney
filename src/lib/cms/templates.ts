import type { CmsContentFields, CmsTemplateType } from "./types";

export interface TemplateFieldDef {
  key: string;
  label: string;
  type: "text" | "textarea" | "image";
  required?: boolean;
  placeholder?: string;
}

export interface TemplateDefinition {
  type: CmsTemplateType;
  label: string;
  icon: string;
  fields: TemplateFieldDef[];
}

/** The Template Engine: Designer will supply the real visual templates
 * later ("暂时不要设计视觉") — for V1 each template is just this field
 * list (营养师只负责填写内容，系统自动套用Template). Adding a template later
 * is exactly: one more entry here + one more enum value in the migration. */
export const TEMPLATES: Record<CmsTemplateType, TemplateDefinition> = {
  image_knowledge: {
    type: "image_knowledge",
    label: "图片知识",
    icon: "🖼️",
    fields: [
      { key: "image_url", label: "图片", type: "image", required: true },
      { key: "key_point", label: "一句重点", type: "text", required: true, placeholder: "例如：晨重前先排尿，数字更准确" },
      { key: "detail", label: "补充说明（选填）", type: "textarea" },
    ],
  },
  supermarket_pick: {
    type: "supermarket_pick",
    label: "超市推荐",
    icon: "🛒",
    fields: [
      { key: "product_name", label: "产品名称", type: "text", required: true },
      { key: "product_image", label: "产品图片", type: "image", required: true },
      { key: "reason", label: "推荐原因", type: "textarea", required: true },
      { key: "where_to_buy", label: "购买地点", type: "text", required: true },
      { key: "how_to_eat", label: "建议吃法", type: "textarea" },
      { key: "notes", label: "注意事项", type: "textarea" },
    ],
  },
  eating_out_guide: {
    type: "eating_out_guide",
    label: "外食攻略",
    icon: "🍽️",
    fields: [
      { key: "venue", label: "店家/场合", type: "text", required: true, placeholder: "例如：Mamak" },
      { key: "recommended_order", label: "建议怎么点", type: "textarea", required: true },
      { key: "avoid", label: "尽量避免", type: "textarea" },
      { key: "notes", label: "注意事项", type: "textarea" },
    ],
  },
  product_tutorial: {
    type: "product_tutorial",
    label: "产品教学",
    icon: "📦",
    fields: [
      { key: "product_image", label: "产品图片", type: "image", required: true },
      { key: "when_to_use", label: "什么时候使用", type: "textarea", required: true },
      { key: "who_for", label: "适合对象", type: "textarea", required: true },
      { key: "notes", label: "注意事项", type: "textarea" },
    ],
  },
  quiz: {
    type: "quiz",
    label: "Quiz",
    icon: "❓",
    fields: [
      { key: "question", label: "题目", type: "text", required: true },
      { key: "option_a", label: "A", type: "text", required: true },
      { key: "option_b", label: "B", type: "text", required: true },
      { key: "option_c", label: "C", type: "text", required: true },
      { key: "correct_answer", label: "正确答案（填 A / B / C）", type: "text", required: true },
      { key: "explanation", label: "答案解析", type: "textarea" },
    ],
  },
  true_false: {
    type: "true_false",
    label: "真/假题",
    icon: "✅",
    fields: [
      { key: "statement", label: "题目叙述", type: "text", required: true },
      { key: "correct_answer", label: "正确答案（填 真 / 假）", type: "text", required: true },
      { key: "explanation", label: "答案解析", type: "textarea" },
    ],
  },
  daily_challenge: {
    type: "daily_challenge",
    label: "每日挑战",
    icon: "🏆",
    fields: [
      { key: "challenge_title", label: "挑战标题", type: "text", required: true },
      { key: "description", label: "挑战说明", type: "textarea", required: true },
      { key: "completion_condition", label: "完成条件", type: "text", required: true },
    ],
  },
};

export const TEMPLATE_LIST = Object.values(TEMPLATES);

export function getTemplate(type: CmsTemplateType): TemplateDefinition {
  return TEMPLATES[type];
}

export function validateFields(type: CmsTemplateType, fields: CmsContentFields): string | null {
  const def = getTemplate(type);
  for (const f of def.fields) {
    if (f.required && !fields[f.key]?.trim()) {
      return `请填写「${f.label}」`;
    }
  }
  return null;
}

/** One customer-facing "card": an optional image, a few short lines, and
 * optionally one interactive question. Card breakdowns are deliberately
 * short per template (30秒~1分钟 per whole item, "不要出现长篇文章"). */
export interface CmsCard {
  image?: string;
  lines: string[];
  interactive?: { options: string[]; correctAnswer: string; explanation?: string };
}

function line(label: string, value?: string): string | null {
  return value?.trim() ? `${label}：${value.trim()}` : null;
}

function compact(lines: (string | null | undefined)[]): string[] {
  return lines.filter((l): l is string => Boolean(l && l.trim()));
}

export function buildCards(templateType: CmsTemplateType, fields: CmsContentFields): CmsCard[] {
  switch (templateType) {
    case "image_knowledge":
      return [{ image: fields.image_url, lines: compact([fields.key_point, fields.detail]) }];
    case "supermarket_pick":
      return [
        { image: fields.product_image, lines: compact([fields.product_name, fields.reason]) },
        { lines: compact([line("购买地点", fields.where_to_buy), line("建议吃法", fields.how_to_eat), line("注意事项", fields.notes)]) },
      ];
    case "eating_out_guide":
      return [
        { lines: compact([fields.venue, fields.recommended_order]) },
        { lines: compact([line("尽量避免", fields.avoid), line("注意事项", fields.notes)]) },
      ];
    case "product_tutorial":
      return [
        { image: fields.product_image, lines: compact([fields.when_to_use]) },
        { lines: compact([line("适合对象", fields.who_for), line("注意事项", fields.notes)]) },
      ];
    case "quiz":
      return [
        {
          lines: compact([fields.question]),
          interactive: {
            options: compact([fields.option_a, fields.option_b, fields.option_c]),
            correctAnswer: fields.correct_answer,
            explanation: fields.explanation,
          },
        },
      ];
    case "true_false":
      return [
        {
          lines: compact([fields.statement]),
          interactive: { options: ["真", "假"], correctAnswer: fields.correct_answer, explanation: fields.explanation },
        },
      ];
    case "daily_challenge":
      return [{ lines: compact([fields.challenge_title, fields.description, line("完成条件", fields.completion_condition)]) }];
    default:
      return [];
  }
}
