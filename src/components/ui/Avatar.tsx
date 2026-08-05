import { getAvatarDef } from "@/lib/avatars";
import { cn } from "@/lib/utils";

/**
 * Renders a profile avatar value. If the value is a known Fabibee avatar ID
 * (e.g. "cool") it shows the image; otherwise it renders the value as-is —
 * legacy emoji ("🙂"/"🌿"), system-traveler emoji, or the `fallback` when null.
 * The parent element controls the circle size/background; the image fills it.
 */
export function Avatar({
  value,
  fallback = "🙂",
  className,
}: {
  value?: string | null;
  fallback?: string;
  className?: string;
}) {
  const def = getAvatarDef(value);
  if (!def) return <>{value ?? fallback}</>;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- small local static asset, sized by parent
    <img
      src={def.file}
      alt={def.name}
      draggable={false}
      className={cn("h-full w-full rounded-full object-cover", className)}
    />
  );
}
