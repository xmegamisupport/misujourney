"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { createProductGuide, updateProductGuide } from "@/lib/staticContent/engine";
import type { ProductGuideItem } from "@/lib/staticContent/types";

export function ProductGuideForm({ existing }: { existing?: ProductGuideItem }) {
  const router = useRouter();
  const { user } = useAuthUser();
  const [name, setName] = useState(existing?.name ?? "");
  const [category, setCategory] = useState(existing?.category ?? "");
  const [summary, setSummary] = useState(existing?.summary ?? "");
  const [status, setStatus] = useState<"draft" | "published">(existing?.status ?? "draft");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!name.trim() || !summary.trim()) {
      setError("请填写产品名称和说明");
      return;
    }
    if (!user) return;
    setSaving(true);
    setError(null);
    const input = { name: name.trim(), category: category.trim(), summary: summary.trim(), status };
    const result = existing ? await updateProductGuide(existing.id, input, user.id) : await createProductGuide(input, user.id);
    setSaving(false);
    if (!result.ok) {
      setError(result.error ?? "保存失败");
      return;
    }
    router.push("/admin/content/guide");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <label className="flex flex-col gap-1.5 text-sm text-slate-600">
        产品名称
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm text-slate-600">
        分类
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="例如：代餐"
          className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm text-slate-600">
        使用说明
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={4}
          className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm text-slate-600">
        状态
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as "draft" | "published")}
          className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
        >
          <option value="draft">草稿</option>
          <option value="published">已发布</option>
        </select>
        <span className="text-xs text-slate-400">已发布的指南才会显示在顾客端「产品使用指南」</span>
      </label>

      {error && <p className="text-sm text-rose-500">{error}</p>}

      <button
        type="button"
        disabled={saving}
        onClick={handleSave}
        className="rounded-xl bg-violet-500 py-3 text-sm font-semibold text-white transition hover:bg-violet-600 disabled:opacity-60"
      >
        {saving ? "保存中..." : "保存"}
      </button>
    </div>
  );
}
