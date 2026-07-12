import { RoleShell } from "@/components/RoleShell";
import { InventorySeedEffect } from "@/components/inventory/InventorySeedEffect";

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleShell role="coach">
      <InventorySeedEffect />
      {children}
    </RoleShell>
  );
}
