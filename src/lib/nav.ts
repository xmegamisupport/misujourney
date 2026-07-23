import type { Role } from "./types";

export interface NavItem {
  href: string;
  /** zh fallback label; RoleShell overrides this with the active language's translation. */
  label: string;
  icon: string;
  key: string;
}

export const customerNav: NavItem[] = [
  { href: "/customer", label: "首页", icon: "🏠", key: "home" },
  // Daily meal logging lives on the Dashboard, not here. This slot is for
  // choosing better food out in the world, which is a different question from
  // recording what you ate.
  { href: "/customer/healthy-picks", label: "好物", icon: "🥗", key: "healthyPicks" },
  // Learning is no longer a tab — it is reached from the Dashboard's 今日学习
  // card, so the sidebar holds product SECTIONS, not duplicate task entry
  // points. This slot is the gamification section (points, levels, badges,
  // rewards). It points at /customer/rewards; the Living Garden at
  // /customer/journey is intentionally NOT linked here (feature paused), so it
  // stays in the codebase but is not customer-facing.
  { href: "/customer/rewards", label: "健康收藏", icon: "🏅", key: "rewards" },
  { href: "/customer/progress", label: "成长", icon: "📈", key: "progress" },
  { href: "/customer/profile", label: "我的", icon: "👤", key: "profile" },
];

export const coachNav: NavItem[] = [
  { href: "/coach", label: "概览", icon: "📊", key: "dashboard" },
  { href: "/coach/customers", label: "顾客", icon: "👥", key: "customers" },
  { href: "/coach/alerts", label: "提醒", icon: "🔔", key: "alerts" },
  { href: "/coach/referral", label: "推荐", icon: "🔗", key: "referral" },
  { href: "/coach/profile", label: "账户", icon: "👤", key: "profile" },
];

export const adminNav: NavItem[] = [
  { href: "/admin", label: "概览", icon: "📊", key: "dashboard" },
  { href: "/admin/users", label: "用户", icon: "🧾", key: "users" },
  { href: "/admin/coaches", label: "教练", icon: "🌿", key: "coaches" },
  { href: "/admin/coach-applications", label: "申请", icon: "📥", key: "coach-applications" },
  { href: "/admin/customers", label: "顾客", icon: "🧑‍🤝‍🧑", key: "customers" },
  { href: "/cms", label: "知识 CMS", icon: "📚", key: "cms" },
  { href: "/admin/settings", label: "设置", icon: "⚙️", key: "settings" },
];

export const roleHome: Record<Role, string> = {
  customer: "/customer",
  coach: "/coach",
  admin: "/admin",
};

/** Post-login / default landing. Coach capability and Customer onboarding are
 * independent states: a coach-capable account (role='customer' + is_coach)
 * that hasn't started its own Journey lands in the Coach Workspace rather than
 * being trapped in customer onboarding. Legacy role='coach' still homes to
 * /coach during the transition. Routing controls UI access only — RLS remains
 * the real data boundary. */
export function resolveHomePath(role: string, isCoach: boolean, onboardingCompleted: boolean): string {
  if (role === "admin") return "/admin";
  if (role === "nutritionist" || role === "trainer") return "/cms";
  if (role === "coach") return "/coach"; // legacy, transitional
  // customer base tier
  if (isCoach && !onboardingCompleted) return "/coach";
  return "/customer";
}

/** Whether an account may enter a protected route tree. UI-access only — RLS
 * remains the real data boundary. /coach is gated by the is_coach capability
 * (plus legacy role='coach' during the transition); the other trees stay
 * strictly role-based. */
export function hasPrefixAccess(prefix: string, role: string, isCoach: boolean): boolean {
  switch (prefix) {
    case "/customer":
      return role === "customer";
    case "/coach":
      return isCoach || role === "coach";
    case "/admin":
      return role === "admin";
    case "/cms":
      return role === "admin" || role === "nutritionist" || role === "trainer";
    default:
      return false;
  }
}

export const roleIcon: Record<Role, string> = {
  customer: "/icons/customer.png",
  coach: "/icons/coach.png",
  admin: "/icons/admin.png",
};

/** zh fallback labels; RoleShell overrides with the active language's translation. */
export const roleLabel: Record<Role, string> = {
  customer: "顾客",
  coach: "Journey Coach",
  admin: "XMEGAMI 管理员",
};

export const roleNav: Record<Role, NavItem[]> = {
  customer: customerNav,
  coach: coachNav,
  admin: adminNav,
};

interface RoleTheme {
  gradient: string;
  chip: string;
  activeText: string;
  activeBg: string;
  ring: string;
  solidBg: string;
  solidBgHover: string;
  softBg: string;
  softText: string;
  border: string;
}

export const roleTheme: Record<Role, RoleTheme> = {
  customer: {
    gradient: "from-emerald-50 via-white to-sky-50",
    chip: "bg-emerald-100 text-emerald-700",
    activeText: "text-emerald-600",
    activeBg: "bg-emerald-50",
    ring: "ring-emerald-400",
    solidBg: "bg-emerald-500",
    solidBgHover: "hover:bg-emerald-600",
    softBg: "bg-emerald-50",
    softText: "text-emerald-700",
    border: "border-emerald-100",
  },
  coach: {
    gradient: "from-sky-50 via-white to-emerald-50",
    chip: "bg-sky-100 text-sky-700",
    activeText: "text-sky-600",
    activeBg: "bg-sky-50",
    ring: "ring-sky-400",
    solidBg: "bg-sky-500",
    solidBgHover: "hover:bg-sky-600",
    softBg: "bg-sky-50",
    softText: "text-sky-700",
    border: "border-sky-100",
  },
  admin: {
    gradient: "from-violet-50 via-white to-slate-50",
    chip: "bg-violet-100 text-violet-700",
    activeText: "text-violet-600",
    activeBg: "bg-violet-50",
    ring: "ring-violet-400",
    solidBg: "bg-violet-500",
    solidBgHover: "hover:bg-violet-600",
    softBg: "bg-violet-50",
    softText: "text-violet-700",
    border: "border-violet-100",
  },
};
