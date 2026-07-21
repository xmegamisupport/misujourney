"use client";

import { createContext, useContext } from "react";

/** Lets an immersive route (Living Garden) drive the shell's bottom navigation
 * from inside a nested layout, without GardenScene — or any garden code — ever
 * learning that navigation exists. The shell owns the state and the nav; the
 * Living Garden layout only reads it to render the toggle. */
export interface ImmersiveNavValue {
  /** True while on an immersive route — the shell hides its chrome. */
  immersive: boolean;
  /** In immersive mode, whether the customer has pulled the bottom nav up. */
  bottomNavVisible: boolean;
  setBottomNavVisible: (visible: boolean) => void;
}

const ImmersiveNavContext = createContext<ImmersiveNavValue | null>(null);

export const ImmersiveNavProvider = ImmersiveNavContext.Provider;

export function useImmersiveNav(): ImmersiveNavValue {
  return (
    useContext(ImmersiveNavContext) ?? {
      immersive: false,
      bottomNavVisible: false,
      setBottomNavVisible: () => {},
    }
  );
}
