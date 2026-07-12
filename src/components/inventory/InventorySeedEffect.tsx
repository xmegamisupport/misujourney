"use client";

import { useEffect } from "react";
import { ensureMockInventorySeeded } from "@/lib/inventory/seed";

export function InventorySeedEffect() {
  useEffect(() => {
    ensureMockInventorySeeded();
  }, []);
  return null;
}
