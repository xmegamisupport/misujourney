/** Placeholder illustration area for the Photo Guide screen — text + a
 * simple icon box standing in for real Designer artwork later. Isolated in
 * its own component with no props/logic so swapping it for a real
 * illustration is a pure visual change, nothing else on the Guide page needs
 * to know or care. */
export function PhotoGuidePlaceholder() {
  return (
    <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-slate-300">
      <span className="text-5xl">🧍‍♀️</span>
    </div>
  );
}
