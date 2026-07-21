"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useImmersiveNav } from "@/components/ImmersiveNavContext";
import { NavigationToggle } from "@/components/living-garden/NavigationToggle";

/** ── Living Garden immersive layout ─────────────────────────────────────────
 *
 * Wraps every Living Garden route (book, chapter pages, garden scene) and adds
 * exactly one thing: the menu toggle. The shell already sheds its chrome on
 * these routes; this layout just fills the space it left and owns the toggle's
 * come-and-go visibility. GardenScene, the engine, the layers, the HUD and the
 * preview all stay entirely unaware that any of this exists.
 *
 * Toggle visibility: bright for ~2s on open, then settles to 35%; any tap
 * anywhere in the garden brings it back to full, and it re-settles after ~3s of
 * stillness. While the menu is open it stays bright. */
export default function LivingGardenImmersiveLayout({ children }: { children: ReactNode }) {
  const { bottomNavVisible, setBottomNavVisible } = useImmersiveNav();
  const [active, setActive] = useState(true);
  const timer = useRef<number | undefined>(undefined);

  const scheduleFade = useCallback((ms: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setActive(false), ms);
  }, []);

  // Bright on entry, then fade after a beat so the customer notices it first.
  useEffect(() => {
    scheduleFade(2000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [scheduleFade]);

  const bump = useCallback(() => {
    setActive(true);
    scheduleFade(3000);
  }, [scheduleFade]);

  return (
    // A tap anywhere in the garden counts as interaction and revives the toggle.
    <div onPointerDown={bump} className="relative flex min-h-0 flex-1 flex-col">
      {children}
      <NavigationToggle
        open={bottomNavVisible}
        active={active}
        onToggle={() => {
          setBottomNavVisible(!bottomNavVisible);
          bump();
        }}
      />
    </div>
  );
}
