"use client";

import { useLanguage, setLanguage } from "@/lib/i18n/useLanguage";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { language, t } = useLanguage();

  return (
    <div className={cn("flex items-center justify-between", className)}>
      <span className="text-sm text-slate-600">{t.language.label}</span>
      <div className="inline-flex items-center gap-0.5 rounded-full border border-slate-200 bg-slate-50 p-1 text-xs">
        {(["zh", "en"] as const).map((lang) => (
          <button
            key={lang}
            type="button"
            onClick={() => setLanguage(lang)}
            className={cn(
              "rounded-full px-2.5 py-1 font-medium transition",
              language === lang ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600",
            )}
          >
            {t.language[lang]}
          </button>
        ))}
      </div>
    </div>
  );
}
