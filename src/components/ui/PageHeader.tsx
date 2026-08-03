import Link from "next/link";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  action?: ReactNode;
}

export function PageHeader({ title, subtitle, backHref, action }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 pt-5 pb-3 md:px-8 md:pt-8">
      <div className="flex min-w-0 items-center gap-3">
        {backHref && (
          <Link
            href={backHref}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink-soft shadow-elev1 transition duration-500 ease-soft hover:-translate-y-0.5 hover:text-brand-deep"
            aria-label="返回"
          >
            ←
          </Link>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold text-ink md:text-xl">{title}</h1>
          {subtitle && <p className="truncate text-sm text-ink-soft">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
