import type { Role } from "./types";

export interface NavItem {
  href: string;
  label: string;
  icon: string;
}

export const customerNav: NavItem[] = [
  { href: "/customer", label: "首页", icon: "🏠" },
  { href: "/customer/checkin", label: "打卡", icon: "✅" },
  { href: "/customer/meals", label: "饮食", icon: "🍽️" },
  { href: "/customer/learn", label: "学习", icon: "📚" },
  { href: "/customer/progress", label: "成长", icon: "📈" },
  { href: "/customer/profile", label: "我的", icon: "👤" },
];

export const coachNav: NavItem[] = [
  { href: "/coach", label: "Dashboard", icon: "📊" },
  { href: "/coach/customers", label: "顾客", icon: "👥" },
  { href: "/coach/alerts", label: "提醒", icon: "🔔" },
  { href: "/coach/messages", label: "消息", icon: "💬" },
  { href: "/coach/referral", label: "Referral", icon: "🔗" },
  { href: "/coach/profile", label: "我的", icon: "👤" },
];

export const adminNav: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/users", label: "Users", icon: "🧾" },
  { href: "/admin/coaches", label: "Coaches", icon: "🌿" },
  { href: "/admin/customers", label: "Customers", icon: "🧑‍🤝‍🧑" },
  { href: "/admin/content/lessons", label: "Content", icon: "🗂️" },
  { href: "/admin/settings", label: "Settings", icon: "⚙️" },
];

export const roleHome: Record<Role, string> = {
  customer: "/customer",
  coach: "/coach",
  admin: "/admin",
};

export const roleLabel: Record<Role, string> = {
  customer: "Customer",
  coach: "Journey Coach",
  admin: "XMEGAMI Admin",
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
