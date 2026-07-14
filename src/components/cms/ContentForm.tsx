"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import {
  createContent,
  createPosterContent,
  submitContentForReview,
  createRevisionDraft,
  updateContent,
  updatePosterContent,
  type PosterMediaInput,
} from "@/lib/cms/engine";
import { getTemplate, validateFields } from "@/lib/cms/templates";
import { CATEGORY_LABELS } from "@/lib/cms/types";
import type { CmsContentCategory, CmsContentCreationMode, CmsContentFields, CmsContentItem, CmsTemplateType } from "@/lib/cms/types";
import { ContentCardViewer } from "./ContentCardViewer";
import { PosterCardViewer } from "./PosterCardViewer";
import { ImageUploadField } from "./ImageUploadField";
import { PosterMediaUploader } from "./PosterMediaUploader";

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS) as [CmsContentCategory, string][];

interface ContentFormProps {
  /** Required when creating new "template" content; ignored once `existing`
   * is set (the item's own contentCreationMode/templateType win). */
  templateType?: CmsTemplateType;
  /** Which form to render for brand-new content. Defaults to "template" to
   * match the existing /cms/new?template= entry point. */
  creationMode?: CmsContentCreationMode;
  existing?: CmsContentItem;
}

export function ContentForm({ templateType, creationMode, existing }: ContentFormProps) {
  const router = useRouter();
  const { user } = useAuthUser();
  const mode: CmsContentCreationMode = existing?.contentCreationMode ?? creationMode ?? "template";
  const template = mode === "template" && templateType ? getTemplate(templateType) : null;

  const [title, setTitle] = useState(existing?.title ?? "");
  const [category, setCategory] = useState<CmsContentCategory>(existing?.category ?? "nutrition_knowledge");
  const [estimatedSeconds, setEstimatedSeconds] = useState(existing?.estimatedSeconds ?? 45);
  const [coverImageUrl, setCoverImageUrl] = useState(existing?.coverImageUrl ?? "");
  const [fields, setFields] = useState<CmsContentFields>(existing?.fields ?? {});
  const [posterMedia, setPosterMedia] = useState<PosterMediaInput[]>(
    existing?.posterMedia.map((m) => ({ fileUrl: m.fileUrl, width: m.width, height: m.height, aspectRatio: m.aspectRatio, fileSize: m.fileSize })) ?? [],
  );
  const [posterDescription, setPosterDescription] = useState(existing?.posterDescription ?? "");
  const [posterAltText, setPosterAltText] = useState(existing?.posterAltText ?? "");
  const [internalNote, setInternalNote] = useState(existing?.internalNote ?? "");
  const [saving, setSaving] = useState<"draft" | "submit" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [creatingRevision, setCreatingRevision] = useState(false);

  const isOwner = !existing || existing.createdBy === user?.id;
  const isAdmin = user?.role === "admin";
  const isPublished = existing?.status === "published";
  const editableStatus = !existing || existing.status === "draft" || existing.status === "needs_revision";
  // Admin can fix up anyone's non-published draft; only the actual creator
  // can submit it for review (submit_content_for_review() itself requires
  // created_by = auth.uid(), so this mirrors what the RPC would allow).
  const canEdit = (isAdmin && !isPublished) || (isOwner && editableStatus);
  const canSubmit = isOwner && editableStatus;

  function updateFieldValue(key: string, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  async function handleCreateRevision() {
    if (!existing) return;
    setError(null);
    setCreatingRevision(true);
    const result = await createRevisionDraft(existing.id);
    setCreatingRevision(false);
    if (!result.ok || !result.data) {
      setError(result.error ?? "建立修改草稿失败");
      return;
    }
    router.push(`/cms/content/${result.data.id}`);
  }

  async function handleSave(submit: boolean) {
    setError(null);
    setSubmitSuccess(false);
    if (!title.trim()) return setError("请输入标题");
    if (mode === "template") {
      if (!templateType) return setError("请先选择内容版型");
      const fieldError = validateFields(templateType, fields);
      if (fieldError) return setError(fieldError);
    } else if (posterMedia.length === 0) {
      return setError("请至少上传一张海报图片");
    }
    if (!user) return;

    setSaving(submit ? "submit" : "draft");

    let contentId = existing?.id;
    if (mode === "template") {
      const input = { title: title.trim(), category, templateType: templateType!, fields, coverImageUrl: coverImageUrl.trim(), estimatedSeconds };
      if (existing) {
        const result = await updateContent(existing.id, input, user.id);
        if (!result.ok) {
          setSaving(null);
          setError(result.error ?? "保存失败");
          return;
        }
      } else {
        const result = await createContent(user.id, input);
        if (!result.ok || !result.data) {
          setSaving(null);
          setError(result.error ?? "保存失败");
          return;
        }
        contentId = result.data.id;
      }
    } else {
      const input = {
        title: title.trim(),
        category,
        media: posterMedia,
        posterDescription: posterDescription.trim(),
        posterAltText: posterAltText.trim(),
        internalNote: internalNote.trim(),
        estimatedSeconds,
      };
      if (existing) {
        const result = await updatePosterContent(existing.id, input, user.id);
        if (!result.ok) {
          setSaving(null);
          setError(result.error ?? "保存失败");
          return;
        }
      } else {
        const result = await createPosterContent(user.id, input);
        if (!result.ok || !result.data) {
          setSaving(null);
          setError(result.error ?? "保存失败");
          return;
        }
        contentId = result.data.id;
      }
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
    if (submit) {
      setSubmitSuccess(true);
    } else {
      router.push("/cms");
    }
  }

  if (existing?.status === "published") {
    return (
      <div className="flex flex-col gap-4 pb-8">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <span className="text-2xl">{mode === "poster_upload" ? "🖼️" : template?.icon}</span>
          <p className="text-sm font-semibold text-slate-800">{existing.title}</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-700">
          修改已发布内容可能影响顾客看到的资料。请先建立一份修改草稿，审核发布后才会取代目前的正式内容。
        </div>
        {error && <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>}
        <button
          type="button"
          disabled={creatingRevision}
          onClick={handleCreateRevision}
          className="rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
        >
          {creatingRevision ? "建立中..." : "📝 建立修改草稿"}
        </button>
      </div>
    );
  }

  if (submitSuccess) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-8 text-center">
        <span className="text-3xl">✅</span>
        <p className="text-sm font-semibold text-emerald-700">内容已提交审核，Admin 审核后才会正式上线。</p>
        <button type="button" onClick={() => router.push("/cms")} className="mt-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600">
          返回内容库
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-8">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <span className="text-2xl">{mode === "poster_upload" ? "🖼️" : template?.icon}</span>
        <p className="text-sm font-semibold text-slate-800">{mode === "poster_upload" ? "上传已设计好的海报" : template?.label}</p>
      </div>

      {existing?.status === "needs_revision" && existing.reviewNote && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-600">
          <p className="mb-1 font-semibold">Admin 退回原因</p>
          <p>{existing.reviewNote}</p>
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <label className="flex flex-col gap-1.5 text-sm text-slate-600">
          {mode === "poster_upload" ? "内容标题" : "标题"}
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

        {mode === "template" && <ImageUploadField label="封面图片（选填，Dashboard 会显示）" value={coverImageUrl} onChange={setCoverImageUrl} disabled={!canEdit} />}

        <label className="flex flex-col gap-1.5 text-sm text-slate-600">
          预计阅读时间（秒{mode === "poster_upload" ? "，选填" : "，建议 30~60"}）
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

      {mode === "template" ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-700">内容版型栏位</p>
          {template?.fields.map((f) =>
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
      ) : (
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <PosterMediaUploader media={posterMedia} onChange={setPosterMedia} disabled={!canEdit} />

          <label className="flex flex-col gap-1.5 text-sm text-slate-600">
            简短说明（选填）
            <textarea
              value={posterDescription}
              onChange={(e) => setPosterDescription(e.target.value)}
              disabled={!canEdit}
              rows={2}
              placeholder="会显示在海报下方"
              className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 disabled:text-slate-400"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm text-slate-600">
            图片替代文字（选填）
            <input
              value={posterAltText}
              onChange={(e) => setPosterAltText(e.target.value)}
              disabled={!canEdit}
              placeholder="给视障顾客的图片说明"
              className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 disabled:text-slate-400"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm text-slate-600">
            内部备注（选填，顾客不会看到）
            <textarea
              value={internalNote}
              onChange={(e) => setInternalNote(e.target.value)}
              disabled={!canEdit}
              rows={2}
              className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 disabled:text-slate-400"
            />
          </label>
        </div>
      )}

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
            {saving === "submit" ? "提交中..." : existing?.status === "needs_revision" ? "重新提交审核" : "提交审核"}
          </button>
        )}
      </div>

      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setPreviewOpen(false)}>
          <div
            className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3">
              <p className="text-sm font-semibold text-slate-800">内容预览</p>
              <button type="button" onClick={() => setPreviewOpen(false)} className="text-slate-400">
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <p className="mb-3 text-center text-xs font-medium text-slate-400">今日小知识</p>
              <p className="mb-4 text-center text-base font-semibold text-slate-900">{title || "（未命名）"}</p>
              {mode === "poster_upload" ? (
                <PosterCardViewer
                  media={posterMedia.map((m, i) => ({ id: `preview-${i}`, fileUrl: m.fileUrl, sortOrder: i, width: m.width, height: m.height, aspectRatio: m.aspectRatio, fileSize: m.fileSize }))}
                  description={posterDescription}
                  altText={posterAltText}
                  onComplete={() => setPreviewOpen(false)}
                />
              ) : (
                <ContentCardViewer templateType={templateType!} fields={fields} imageSize="lg" onComplete={() => setPreviewOpen(false)} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
