"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { useBodyProgressRecord } from "@/lib/bodyProgress/hooks";
import { getBodyProgressPhotoSignedUrl } from "@/lib/bodyProgress/engine";
import { BodyProgressPhotoGrid, type BodyProgressPhotoGridItem } from "@/components/bodyProgress/BodyProgressPhotoGrid";
import type { BodyProgressAngle } from "@/lib/bodyProgress/types";

function formatMonthDay(iso: string): string {
  const [, month, day] = iso.slice(0, 10).split("-");
  return `${Number(month)}月${Number(day)}日`;
}

/** View-only — no edit/delete anywhere, matching the append-only guarantee
 * already enforced at the RLS layer (Sprint 001) and the RPC layer (Sprint
 * 002). Reuses the same "fetch full RLS-scoped history, find() the id"
 * pattern already proven for check-in history detail, so URL tampering with
 * :recordId can never leak another customer's row.
 *
 * Extension point for Sprint 004: BodyProgressPhotoGrid takes a flat photo
 * list, not a whole page layout, specifically so a future comparison view
 * can render two of these side by side without restructuring this page. */
export default function BodyProgressRecordDetailPage() {
  const params = useParams<{ recordId: string }>();
  const { user } = useAuthUser();
  const customerId = user?.id ?? "";
  const { data: record, loading } = useBodyProgressRecord(customerId, params.recordId);
  const [photoItems, setPhotoItems] = useState<BodyProgressPhotoGridItem[]>([]);

  useEffect(() => {
    if (!record) return;
    let cancelled = false;
    Promise.all(
      record.photos.map(async (photo) => ({ angle: photo.angle, url: await getBodyProgressPhotoSignedUrl(photo.originalPath) }))
    ).then((items) => {
      if (!cancelled) {
        const order: BodyProgressAngle[] = ["front", "left", "right", "back"];
        setPhotoItems(order.map((angle) => items.find((i) => i.angle === angle)).filter((i): i is BodyProgressPhotoGridItem => Boolean(i)));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [record]);

  return (
    <div className="flex flex-col gap-4 px-4 pb-8 md:px-8">
      <PageHeader title="记录详情" backHref="/customer/progress/body/history" />

      {!loading && !record ? (
        <EmptyState icon="🔍" title="找不到这条记录" />
      ) : record ? (
        <>
          <BodyProgressPhotoGrid photos={photoItems} />

          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="grid grid-cols-2 gap-y-3 text-sm">
              <div>
                <p className="text-xs text-slate-400">Journey Day</p>
                <p className="text-base font-semibold text-slate-900">{record.journeyDay}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">提交日期</p>
                <p className="text-base font-semibold text-slate-900">{formatMonthDay(record.submittedAt)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">体重快照</p>
                <p className="text-base font-semibold text-slate-900">{record.weightValue !== null ? `${record.weightValue}${record.weightUnit ?? "kg"}` : "暂无"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">体重记录日期</p>
                <p className="text-base font-semibold text-slate-900">{record.sourceCheckinDate ? formatMonthDay(record.sourceCheckinDate) : "—"}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-slate-400">Journey 计划</p>
                <p className="text-base font-semibold text-slate-900">{record.journeyPlanDays} 天计划</p>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
