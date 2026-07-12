import { RoleShell } from "@/components/RoleShell";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return <RoleShell role="customer">{children}</RoleShell>;
}
