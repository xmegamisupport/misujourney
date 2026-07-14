"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { createContent, updateContent, submitContentForReview } from "@/lib/cms/engine";
import { getTemplate, validateFields } from "@/lib/cms/templates";
import { CATEGORY_LABELS } from "@/lib/cms/types";
import type { CmsContentCategory, CmsContentFields, CmsContentItem, CmsTemplateType } from "@/lib/cms/types";
import { ContentCardViewer } from "./ContentCardViewer";
import { ImageUploadField } from "./ImageUploadField";

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS) as [CmsContentCategory, string][];

interface ContentFormProps {
  templateType: CmsTemplateType;
  existing?: CmsContentItem;
}

export function ContentForm({ templateType, existing }: ContentFormProps) {
  const router = useRouter();
  const { user } = useAuthUser();
  const template = getTemplate(templateType);

  const [title, setTitle] = useState(existing?.title ?? "");
  const [category, setCategory] = useState<CmsContentCategory>(existing?.category ?? "nutrition_knowledge");
  const [estimatedSeconds, setEstimatedSeconds] = useState(existing?.estimatedSeconds ?? 45);
  const [coverImageUrl, setCoverImageUrl] = useState(existing?.coverImageUrl ?? "");
  const [fields, setFields] = useState<CmsContentFields>(existing?.fields ?? {});
  const [saving, setSaving] = useState<"draft" | "submit" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const isOwner = !existing || existing.createdBy === user?.id;
  const isAdmin = user?.role === "admin";
  const editableStatus = !existing || existing.status === "draft" || existing.status === "rejected";
  const canEdit = isAdmin || (isOwner && editableStatus);
  const canSubmit = !isAdmin && isOwner && editableStatus;

  function updateFieldValue(key: string, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  async function handleSave(submit: boolean) {
    setError(null);
    if (!title.trim()) return setError("请输入标题");
    const fieldError = validateFields(templateType, fields);
    if (fieldError) return setError(fieldError);

    setSaving(submit ? "submit" : "draft");
    const input = { title: title.trim(), category, templateType, fields, coverImageUrl: coverImageUrl.trim(), estimatedSeconds };

    let contentId = existing?.id;
    if (existing) {
      const result = await updateContent(existing.id, input);
      if (!result.ok) {
        setSaving(null);
        setError(result.error ?? "保存失败");
        return;
      }
    } else {
      if (!user) return;
      const result = await createContent(user.id, input);
      if (!result.ok || !result.data) {
        setSaving(null);
        setError(result.error ?? "保存失败");
        return;
      }
      contentId = result.data.id;
    }

    if (submit && contentId) {
      const subResult = await submitContentForReview(contentId);
      if (!subResult.ok) {
        setSaving(null);
        setError(subResult.error ?? "提交审核失败");
        return;
      }
    }

    setSaving(null);
    router.push("/cms");
  }

  return (
    <div className="flex flex-col gap-4 pb-8">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <span className="text-2xl">{template.icon}</span>
        <p className="text-sm font-semibold text-slate-800">{template.label}</p>
      </div>

      {existing?.status === "rejected" && existing.rejectionReason && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-600">
          <p className="mb-1 font-semibold">Admin 退回原因</p>
          <p>{existing.rejectionReason}</p>
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <label className="flex flex-col gap-1.5 text-sm text-slate-600">
          标题
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={!canEdit}
            placeholder="例如：为什么晨重要空腹"
            className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 disabled:text-slate-400"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm text-slate-600">
          分类
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as CmsContentCategory)}
            disabled={!canEdit}
            className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 disabled:text-slate-400"
          >
            {CATEGORY_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <ImageUploadField label="封面图片（选填，Dashboard 会显示）" value={coverImageUrl} onChange={setCoverImageUrl} disabled={!canEdit} />

        <label className="flex flex-col gap-1.5 text-sm text-slate-600">
          预计阅读时间（秒，建议 30~60）
          <input
            type="number"
            min={10}
            max={90}
            value={estimatedSeconds}
            onChange={(e) => setEstimatedSeconds(Number(e.target.value))}
            disabled={!canEdit}
            className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 disabled:text-slate-400"
          />
        </label>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-slate-700">内容版型栏位</p>
        {template.fields.map((f) =>
          f.type === "image" ? (
            <ImageUploadField key={f.key} label={f.label} value={fields[f.key] ?? ""} onChange={(url) => updateFieldValue(f.key, url)} disabled={!canEdit} />
          ) : (
            <label key={f.key} className="flex flex-col gap-1.5 text-sm text-slate-600">
              {f.label}
              {f.type === "textarea" ? (
                <textarea
                  value={fields[f.key] ?? ""}
                  onChange={(e) => updateFieldValue(f.key, e.target.value)}
                  disabled={!canEdit}
                  rows={2}
                  className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 disabled:text-slate-400"
                />
              ) : (
                <input
                  value={fields[f.key] ?? ""}
                  onChange={(e) => updateFieldValue(f.key, e.target.value)}
                  disabled={!canEdit}
                  placeholder={f.placeholder}
                  className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 disabled:text-slate-400"
                />
              )}
            </label>
          ),
        )}
      </div>

      {error && <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition hover:border-emerald-300 hover:text-emerald-600"
        >
          👀 预览
        </button>
        {canEdit && (
          <button
            type="button"
            disabled={saving !== null}
            onClick={() => handleSave(false)}
            className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition hover:border-emerald-300 hover:text-emerald-600 disabled:opacity-60"
          >
            {saving === "draft" ? "储存中..." : "储存草稿"}
          </button>
        )}
        {canSubmit && (
          <button
            type="button"
            disabled={saving !== null}
            onClick={() => handleSave(true)}
            className="flex-1 rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
          >
            {saving === "submit" ? "提交中..." : "提交审核"}
          </button>
        )}
      </div>

      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setPreviewOpen(false)}>
          <div
            className="flex max-h-[90vh] w-full max-w-sm flex-col overflow-hidden rounded-[2.5rem] border-8 border-slate-900 bg-slate-50 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3">
              <p className="text-sm font-semibold text-slate-800">顾客画面预览</p>
              <button type="button" onClick={() => setPreviewOpen(false)} className="text-slate-400">
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <p className="mb-3 text-center text-xs font-medium text-slate-400">今日小知识</p>
              <p className="mb-4 text-center text-base font-semibold text-slate-900">{title || "（未命名）"}</p>
              <ContentCardViewer templateType={templateType} fields={fields} onComplete={() => setPreviewOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
