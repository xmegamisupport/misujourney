"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { useBodyProgressHistory } from "@/lib/bodyProgress/hooks";
import { getBodyProgressPhotoSignedUrl } from "@/lib/bodyProgress/engine";
import { BodyProgressMilestoneCard } from "@/components/bodyProgress/BodyProgressMilestoneCard";

/** Newest first, each row framed as a milestone rather than a bare date —
 * BodyProgressMilestoneCard is the one place deciding "Starting Point
 * Complete" vs "Milestone Complete" wording. */
export default function BodyProgressHistoryPage() {
  const { user } = useAuthUser();
  const customerId = user?.id ?? "";
  const { data: history, loading } = useBodyProgressHistory(customerId);
  const [frontUrls, setFrontUrls] = useState<Record<string, string | null>>({});

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      history.map(async (record) => {
        const front = record.photos.find((p) => p.angle === "front");
        return [record.id, front ? await getBodyProgressPhotoSignedUrl(front.originalPath) : null] as const;
      })
    ).then((entries) => {
      if (!cancelled) setFrontUrls(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [history]);

  return (
    <div className="flex flex-col gap-3 px-4 pb-8 md:px-8">
      <PageHeader title="我的成长记录" subtitle={`共 ${history.length} 个里程碑`} backHref="/customer/progress/body" />

      {!loading && history.length === 0 ? (
        <EmptyState icon="🌱" title="还没有身形记录" description="随时可以开始记录你的第一个起点" />
      ) : (
        history.map((record, index) => (
          <BodyProgressMilestoneCard
            key={record.id}
            record={record}
            isFirst={index === history.length - 1}
            frontPhotoUrl={frontUrls[record.id] ?? null}
            href={`/customer/progress/body/history/${record.id}`}
          />
        ))
      )}
    </div>
  );
}
