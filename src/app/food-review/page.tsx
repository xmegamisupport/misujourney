"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// ── Types (only the inbox columns this workspace uses) ──────────────────────
interface SuggestedNutrition {
  calories?: number;
  protein?: number;
  carbohydrate?: number;
  fat?: number;
  fiber?: number;
}
interface Miss {
  id: string;
  original_name: string;
  confidence: number | null;
  occurrences: number;
  status: string;
  priority_score: number;
  first_seen_source: string;
  recognition_type: string | null;
  suggested_nutrition: SuggestedNutrition | null;
  suggested_serving_g: number | null;
  suggested_serving_name: string | null;
  suggested_components: { name: string; category: string }[] | null;
  suggested_aliases: string[] | null;
  last_seen_at: string;
  resolved_food_id: string | null;
}
interface AnalyticsRow {
  name: string;
  total: number;
  verified: number;
  estimate: number;
  verified_hit_rate: number;
  avg_confidence: number | null;
  last_30_days: number;
}

type Filter = "high" | "new" | "reviewing" | "published" | "ignored";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "high", label: "高优先" },
  { key: "new", label: "New" },
  { key: "reviewing", label: "Reviewing" },
  { key: "published", label: "Published" },
  { key: "ignored", label: "Ignored" },
];

const supabase = createClient();
const fmtDate = (s: string) => (s ? new Date(s).toLocaleDateString() : "—");
const pct = (n: number | null | undefined) => (n == null ? "—" : `${n}%`);

export default function FoodReviewPage() {
  const [role, setRole] = useState<string | null | undefined>(undefined);
  const [filter, setFilter] = useState<Filter>("high");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<Miss[]>([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<Record<string, AnalyticsRow>>({});
  const [selected, setSelected] = useState<Miss | null>(null);

  useEffect(() => {
    supabase.rpc("my_food_role").then(({ data }) => setRole((data as string | null) ?? null));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("food_match_misses").select("*").order("priority_score", { ascending: false }).limit(100);
    q = filter === "high" ? q.in("status", ["new", "reviewing"]) : q.eq("status", filter);
    if (search.trim()) q = q.ilike("original_name", `%${search.trim()}%`);
    const { data } = await q;
    setItems((data as unknown as Miss[]) ?? []);
    setLoading(false);
  }, [filter, search]);

  useEffect(() => {
    if (role !== "food_editor" && role !== "food_reviewer" && role !== "food_admin") return;
    const id = setTimeout(() => void load(), 0); // defer so load()'s setState isn't synchronous in the effect
    return () => clearTimeout(id);
  }, [role, load]);

  useEffect(() => {
    if (!role || role === "null") return;
    supabase.rpc("food_recognition_analytics", { p_limit: 300 }).then(({ data }) => {
      const map: Record<string, AnalyticsRow> = {};
      for (const r of ((data as unknown as AnalyticsRow[]) ?? [])) map[r.name.toLowerCase()] = r;
      setAnalytics(map);
    });
  }, [role]);

  const canReview = role === "food_reviewer" || role === "food_admin";

  if (role === undefined) return <div className="p-8 text-sm text-slate-400">加载中…</div>;
  if (role === null) {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <p className="text-lg font-semibold text-slate-800">Food Reviewer Workspace</p>
        <p className="mt-2 text-sm text-slate-500">需要 Food 团队权限（Food Editor / Reviewer / Admin）。请联系管理员授予。</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
      <header className="mb-4">
        <h1 className="text-xl font-bold text-slate-900">🍽️ Recognition Inbox</h1>
        <p className="mt-0.5 text-xs text-slate-500">按优先级审核缺失食物 → 编辑 → 发布为 MISU Verified · 你的角色：{role}</p>
      </header>

      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              filter === f.key ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {f.label}
          </button>
        ))}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索食物名称…"
          className="ml-auto w-40 rounded-full border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-slate-400"
        />
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-slate-400">加载中…</p>
      ) : items.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">这个筛选下没有条目。</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((m) => {
            const a = analytics[m.original_name.toLowerCase()];
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => setSelected(m)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3.5 text-left shadow-sm transition hover:border-slate-300"
                >
                  <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                    <span className="text-xs font-bold leading-none">{Number(m.priority_score).toFixed(0)}</span>
                    <span className="text-[8px] leading-none">PRI</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">{m.original_name}</p>
                    <p className="mt-0.5 truncate text-[11px] text-slate-400">
                      ×{m.occurrences} · {m.recognition_type ?? "—"} · conf {pct(m.confidence != null ? Math.round(m.confidence * 100) : null)} · {m.first_seen_source} · {fmtDate(m.last_seen_at)}
                    </p>
                  </div>
                  {a && (
                    <span className="shrink-0 rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                      {a.total}次 · {a.verified_hit_rate}%✓
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {selected && (
        <ReviewSheet
          miss={selected}
          analytics={analytics[selected.original_name.toLowerCase()]}
          canReview={canReview}
          onClose={() => setSelected(null)}
          onDone={() => {
            setSelected(null);
            void load();
          }}
        />
      )}
    </div>
  );
}

// ── Review detail sheet ─────────────────────────────────────────────────────
function ReviewSheet({
  miss,
  analytics,
  canReview,
  onClose,
  onDone,
}: {
  miss: Miss;
  analytics?: AnalyticsRow;
  canReview: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const n = miss.suggested_nutrition ?? {};
  const [canonicalName, setCanonicalName] = useState(miss.original_name);
  const [aliases, setAliases] = useState((miss.suggested_aliases ?? []).join("\n"));
  const [servingName, setServingName] = useState(miss.suggested_serving_name ?? "");
  const [servingG, setServingG] = useState(miss.suggested_serving_g?.toString() ?? "");
  const [calories, setCalories] = useState(n.calories?.toString() ?? "");
  const [protein, setProtein] = useState(n.protein?.toString() ?? "");
  const [carbohydrate, setCarbohydrate] = useState(n.carbohydrate?.toString() ?? "");
  const [fat, setFat] = useState(n.fat?.toString() ?? "");
  const [fiber, setFiber] = useState(n.fiber?.toString() ?? "");
  const [images, setImages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: paths } = await supabase.rpc("food_inbox_representative_images", { p_miss_id: miss.id });
      const list = (paths as string[] | null) ?? [];
      const urls: string[] = [];
      for (const p of list) {
        const { data } = await supabase.storage.from("food-inbox-images").createSignedUrl(p, 3600);
        if (data?.signedUrl) urls.push(data.signedUrl);
      }
      setImages(urls);
    })();
  }, [miss.id]);

  const nutritionReady = calories.trim() !== "" && protein.trim() !== "" && carbohydrate.trim() !== "" && fat.trim() !== "";

  async function publish() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/food-review/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          missId: miss.id,
          overrides: {
            canonicalName: canonicalName.trim(),
            aliases: aliases.split("\n").map((s) => s.trim()).filter(Boolean),
            servingName: servingName.trim() || null,
            servingG: servingG.trim() || null,
            nutrition: {
              calories: Number(calories) || 0,
              protein: Number(protein) || 0,
              carbohydrate: Number(carbohydrate) || 0,
              fat: Number(fat) || 0,
              fiber: Number(fiber) || 0,
            },
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "发布失败");
      onDone();
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : "发布失败");
    }
  }

  async function ignore() {
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.rpc("food_inbox_triage", { p_id: miss.id, p_action: "ignore", p_payload: {} });
    if (e) {
      setBusy(false);
      setError(e.message);
      return;
    }
    onDone();
  }

  const field = "w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-slate-400";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 md:items-center" onClick={onClose}>
      <div
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl md:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-slate-400">AI 识别为</p>
            <p className="truncate text-lg font-bold text-slate-900">{miss.original_name}</p>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 rounded-full px-2 py-1 text-xs text-slate-400">关闭</button>
        </div>

        {/* light analytics */}
        {analytics && (
          <div className="mb-3 grid grid-cols-5 gap-1 rounded-xl bg-slate-50 p-2 text-center">
            {[
              ["总辨识", analytics.total],
              ["估算", analytics.estimate],
              ["命中率", `${analytics.verified_hit_rate}%`],
              ["平均置信", analytics.avg_confidence != null ? `${analytics.avg_confidence}%` : "—"],
              ["30天", analytics.last_30_days],
            ].map(([k, v]) => (
              <div key={k as string}>
                <p className="text-sm font-bold text-slate-800">{v}</p>
                <p className="text-[9px] text-slate-400">{k}</p>
              </div>
            ))}
          </div>
        )}

        {/* representative images */}
        {images.length > 0 && (
          <div className="mb-3 flex gap-2 overflow-x-auto">
            {images.map((u) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={u} src={u} alt="识别照片" className="h-24 w-24 shrink-0 rounded-xl object-cover" />
            ))}
          </div>
        )}

        {/* components + first seen */}
        <div className="mb-3 flex flex-wrap gap-1 text-[11px] text-slate-500">
          <span className="rounded-full bg-slate-100 px-2 py-0.5">来源 {miss.first_seen_source}</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5">类型 {miss.recognition_type ?? "—"}</span>
          {(miss.suggested_components ?? []).map((c, i) => (
            <span key={i} className="rounded-full bg-slate-100 px-2 py-0.5">{c.name}</span>
          ))}
        </div>

        {/* edit form */}
        <div className="flex flex-col gap-2.5">
          <label className="text-xs font-medium text-slate-600">规范名称
            <input value={canonicalName} onChange={(e) => setCanonicalName(e.target.value)} className={field} />
          </label>
          <label className="text-xs font-medium text-slate-600">别名（每行一个）
            <textarea value={aliases} onChange={(e) => setAliases(e.target.value)} rows={2} className={field} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-medium text-slate-600">份量说明
              <input value={servingName} onChange={(e) => setServingName(e.target.value)} placeholder="1 盘" className={field} />
            </label>
            <label className="text-xs font-medium text-slate-600">份量克数
              <input value={servingG} onChange={(e) => setServingG(e.target.value)} inputMode="numeric" placeholder="g" className={field} />
            </label>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {[
              ["热量", calories, setCalories],
              ["蛋白", protein, setProtein],
              ["碳水", carbohydrate, setCarbohydrate],
              ["脂肪", fat, setFat],
              ["纤维", fiber, setFiber],
            ].map(([label, val, set]) => (
              <label key={label as string} className="text-[10px] font-medium text-slate-500">{label as string}
                <input
                  value={val as string}
                  onChange={(e) => (set as (s: string) => void)(e.target.value)}
                  inputMode="decimal"
                  className="w-full rounded-lg border border-slate-200 px-1.5 py-1.5 text-sm outline-none focus:border-slate-400"
                />
              </label>
            ))}
          </div>
          <p className="text-[10px] text-slate-400">发布后来源记为 MISU Manual（已审核），未来同名辨识将显示 🟢 MISU Verified。</p>
        </div>

        {error && <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</div>}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={ignore}
            disabled={busy}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-500 disabled:opacity-50"
          >
            忽略
          </button>
          <button
            type="button"
            onClick={publish}
            disabled={busy || !canReview || !nutritionReady || !canonicalName.trim()}
            title={!canReview ? "需要 Reviewer 权限" : !nutritionReady ? "请填写营养数据" : ""}
            className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            {busy ? "处理中…" : "发布为 MISU Verified"}
          </button>
        </div>
        {!canReview && <p className="mt-1.5 text-center text-[10px] text-slate-400">你是 Food Editor，只能忽略；发布需 Reviewer。</p>}
      </div>
    </div>
  );
}
