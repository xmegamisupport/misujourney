import { RoleShell } from "@/components/RoleShell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <RoleShell role="admin">{children}</RoleShell>;
}
