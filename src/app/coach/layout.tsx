import { RoleShell } from "@/components/RoleShell";
import { CoachWelcomeGate } from "@/components/coach/CoachWelcomeGate";

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleShell role="coach">
      <CoachWelcomeGate />
      {children}
    </RoleShell>
  );
}
