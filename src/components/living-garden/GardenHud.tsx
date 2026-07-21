"use client";

export type GardenSheetKey = "points" | "badges" | "rewards" | "more";

const HUD_ITEMS: { key: GardenSheetKey; icon: string; label: string }[] = [
  { key: "points", icon: "⭐", label: "Journey Points" },
  { key: "badges", icon: "🏅", label: "徽章" },
  { key: "rewards", icon: "🎁", label: "奖励" },
  { key: "more", icon: "☰", label: "更多" },
];

/** The entire interface, and it stays out of the way on purpose.
 *
 * A tiny column of icons in the top-right corner is all the chrome the garden
 * gets — the garden itself is the main character, so the HUD must never grow
 * into a toolbar or block the scene. Each icon opens a bottom sheet; nothing
 * here navigates away. */
export function GardenHud({ onOpen }: { onOpen: (key: GardenSheetKey) => void }) {
  return (
    <div className="absolute right-3 top-3 z-30 flex flex-col gap-2">
      {HUD_ITEMS.map((item) => (
        <button
          key={item.key}
          type="button"
          aria-label={item.label}
          onClick={() => onOpen(item.key)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-base shadow-sm backdrop-blur transition active:scale-95"
        >
          {item.icon}
        </button>
      ))}
    </div>
  );
}
