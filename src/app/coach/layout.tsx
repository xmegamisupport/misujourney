import { RoleShell } from "@/components/RoleShell";

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleShell role="coach">
      {children}
    </RoleShell>
  );
}
