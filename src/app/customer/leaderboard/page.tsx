"use client";

import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { useJourneyPoints } from "@/lib/journey-points/hooks";
import { Chip } from "@/components/ui/Chip";

/**
 * 🏆 Leaderboard — COMMUNITY motivation, deliberately separate from personal
 * progress. "My Progress" (我的 → 我的进展) is about comparing yourself with your
 * past; the Leaderboard is about "our journey" — how you're doing alongside
 * everyone else. This page is the permanent home for every future competitive /
 * community feature (points ranking, weekly ranking, weekly challenge, …).
 *
 * The user's own Journey Points are real (that number is theirs). Cross-user
 * rankings need a ranking model + a privacy/consent decision, so those sections
 * are shown as honest "即将开放" scaffolds rather than fabricated data.
 */
export default function LeaderboardPage() {
  const { user } = useAuthUser();
  const { balance } = useJourneyPoints(user?.id ?? "");
  const points = balance?.total ?? 0;
  const todayPoints = balance?.today ?? 0;

  return (
    <div className="relative min-h-[calc(100vh-4rem)] px-4 pb-28 pt-2">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(90%_100%_at_20%_0%,#fce9ef_0%,transparent_72%)]"
      />

      <div className="relative flex flex-col gap-5">
        <header className="misu-rise pt-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-deep">Leaderboard</p>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-ink">排行榜</h1>
          <p className="mt-0.5 text-xs text-ink-soft">我们的旅程 —— 一起走，比一个人走更有劲。</p>
        </header>

        {/* My standing — the one number that is genuinely the user's own. */}
        <section
          className="misu-rise relative overflow-hidden rounded-card border border-white/70 bg-gradient-to-br from-brand-tint via-white to-[#f0ece9] p-5 shadow-elev2"
          style={{ animationDelay: "60ms" }}
        >
          <div className="pointer-events-none absolute -right-6 -top-8 h-32 w-32 rounded-full bg-brand-soft/40 blur-3xl" />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <Chip icon="🏅" tone="brand">我的积分</Chip>
              <p className="mt-3 text-4xl font-extrabold tabular-nums text-ink">
                {points.toLocaleString()}
                <span className="ml-1.5 text-sm font-semibold text-ink-faint">pts</span>
              </p>
              <p className="mt-1 text-xs text-ink-soft">
                {todayPoints > 0 ? `今天 +${todayPoints} · ` : ""}继续完成每日 Journey，积分会一直累积。
              </p>
            </div>
            <div className="shrink-0 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-3xl shadow-elev1">🏆</div>
              <p className="mt-2 text-[10px] font-medium text-ink-faint">本周排名</p>
              <p className="text-sm font-bold text-brand-deep">即将开放</p>
            </div>
          </div>
        </section>

        {/* Weekly Challenge — a shared goal for everyone, each week. */}
        <section className="misu-rise" style={{ animationDelay: "120ms" }}>
          <h2 className="mb-3 flex items-center gap-2 text-[15px] font-bold text-ink">
            本周挑战 <Chip icon="🎯">即将开放</Chip>
          </h2>
          <div className="rounded-card border border-line bg-surface p-5 shadow-elev1">
            <p className="text-sm font-semibold text-ink">和大家一起,完成本周的小目标</p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
              每周一个共同的挑战 —— 比如「7 天都完成饮水」。达成的人会一起出现在这里，
              让坚持不再是一个人的事。
            </p>
          </div>
        </section>

        {/* Rankings — the community view. Scaffolded honestly until the ranking
            model + privacy choice land. */}
        <section className="misu-rise" style={{ animationDelay: "180ms" }}>
          <h2 className="text-[15px] font-bold text-ink">排行榜</h2>
          <p className="mb-3 mt-0.5 text-xs text-ink-soft">看看我们这一群人，这一周走得怎么样。</p>
          <div className="grid gap-3">
            <RankingScaffold icon="🌱" title="Journey Points 排行榜" note="按累计积分,看看整个社群的坚持。" />
            <RankingScaffold icon="🔥" title="本周排行榜" note="只看这一周 —— 每周一重新开始,人人都有机会。" />
          </div>
        </section>

        {/* The one line that keeps the two systems from blurring. */}
        <p className="misu-rise px-2 pt-1 text-center text-xs leading-relaxed text-ink-faint" style={{ animationDelay: "220ms" }}>
          排行榜是「我们」——和大家一起。想看自己的成长轨迹，在
          <span className="font-medium text-ink-soft"> 我的 → 我的进展</span>。
        </p>
      </div>
    </div>
  );
}

/** A coming-soon ranking card — a greyed podium that shows the shape of what's
 *  coming, honestly labelled, with no invented names or numbers. */
function RankingScaffold({ icon, title, note }: { icon: string; title: string; note: string }) {
  return (
    <div className="rounded-card border border-line bg-surface p-4 shadow-elev1">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          <span>{icon}</span>
          {title}
        </p>
        <Chip>即将开放</Chip>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-ink-soft">{note}</p>
      <div className="mt-3 flex flex-col gap-1.5">
        {["🥇", "🥈", "🥉"].map((medal, i) => (
          <div key={medal} className="flex items-center gap-3 rounded-lg bg-canvas px-3 py-2.5">
            <span className="text-base opacity-70">{medal}</span>
            <span className="h-2.5 flex-1 rounded-full bg-line" style={{ maxWidth: `${70 - i * 14}%` }} />
            <span className="text-[11px] font-medium tabular-nums text-ink-faint">—</span>
          </div>
        ))}
      </div>
    </div>
  );
}
