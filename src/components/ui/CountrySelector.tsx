"use client";

import { useMemo, useState } from "react";
import { COUNTRIES, type Country } from "@/lib/countries";
import { cn } from "@/lib/utils";

interface CountrySelectorProps {
  value: string;
  onChange: (iso2: string) => void;
}

/** Searchable country + dial-code picker, built with plain state (no combobox
 * dependency in this codebase yet) — a backdrop closes the dropdown on
 * outside click/tap, same pattern as CoachContactSheet. */
export function CountrySelector({ value, onChange }: CountrySelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = COUNTRIES.find((c) => c.iso2 === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(q) || c.dialCode.includes(q));
  }, [query]);

  function handleSelect(country: Country) {
    onChange(country.iso2);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3.5 py-2.5 text-left text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
      >
        <span className={selected ? "text-slate-800" : "text-slate-400"}>
          {selected ? `${selected.name} +${selected.dialCode}` : "选择国家/地区"}
        </span>
        <span className="text-slate-400">▾</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索国家名称或区号..."
              className="w-full border-b border-slate-100 px-3.5 py-2.5 text-sm outline-none"
            />
            <div className="max-h-64 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="px-3.5 py-3 text-sm text-slate-400">没有找到符合的国家</p>
              ) : (
                filtered.map((c) => (
                  <button
                    key={c.iso2}
                    type="button"
                    onClick={() => handleSelect(c)}
                    className={cn(
                      "flex w-full items-center justify-between px-3.5 py-2.5 text-left text-sm transition hover:bg-slate-50",
                      c.iso2 === value ? "bg-sky-50 text-sky-700" : "text-slate-700",
                    )}
                  >
                    <span>{c.name}</span>
                    <span className="text-slate-400">+{c.dialCode}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
