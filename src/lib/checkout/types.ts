import type { Enums } from "@/lib/supabase/database.types";

export type BowelMovementLevel = Enums<"bowel_movement_level">;

export type SpecialCondition = "gathering" | "eating_out" | "period" | "late_night" | "sick" | "stress" | "travel" | "other";

export interface EveningCheckout {
  id: string;
  customerId: string;
  checkoutDate: string;
  bowelMovement: BowelMovementLevel;
  specialConditions: SpecialCondition[];
  notes: string | null;
  completedAt: string;
  createdAt: string;
}

export interface CheckoutEngineResult<T = void> {
  ok: boolean;
  error?: string;
  data?: T;
}
