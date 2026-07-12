import Link from "next/link";
import { currentCoach } from "@/lib/mock-data";

const roleCards = [
  {
    href: "/customer",
    icon: "🌸",
    title: "Customer",
    subtitle: "顾客端",
    desc: "每日打卡、饮食记录、学习成长，陪伴式变美旅程",
    accent: "border-emerald-100 hover:border-emerald-300 bg-emerald-50/50",
    chip: "bg-emerald-100 text-emerald-700",
  },
  {
    href: "/coach",
    icon: "🌿",
    title: "Journey Coach",
    subtitle: "教练端",
    desc: "顾客管理、跟进提醒、消息沟通，高效陪跑每一位顾客",
    accent: "border-sky-100 hover:border-sky-300 bg-sky-50/50",
    chip: "bg-sky-100 text-sky-700",
  },
  {
    href: "/admin",
    icon: "🛡️",
    title: "XMEGAMI Admin",
    subtitle: "管理端",
    desc: "全平台用户、教练、内容与数据管理",
    accent: "border-violet-100 hover:border-violet-300 bg-violet-50/50",
    chip: "bg-violet-100 text-violet-700",
  },
];

const publicLinks = [
  { href: "/login", label: "登录 Login" },
  { href: "/register", label: "注册 Register" },
  { href: "/forgot-password", label: "忘记密码" },
  { href: `/join/${currentCoach.referralCode}`, label: "Referral 邀请页示例" },
];

export default function Home() {
  return (
    <div className="min-h-screen flex-1 bg-gradient-to-b from-emerald-50 via-white to-sky-50">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-6 pb-10 pt-16 text-center md:pt-24">
        <span className="text-5xl">🌱</span>
        <h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">MISU Journey</h1>
        <p className="text-base text-emerald-600 md:text-lg">Every Day Is A New Journey</p>
        <p className="max-w-md text-sm text-slate-500">
          第一阶段 UI Demo — 陪伴式健康管理平台。以下为三种角色的界面预览入口，无需真实登入即可切换查看。
        </p>
      </div>

      <div className="mx-auto grid max-w-5xl gap-4 px-6 pb-10 md:grid-cols-3">
        {roleCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className={`flex flex-col gap-3 rounded-3xl border p-6 shadow-sm transition ${card.accent}`}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-2xl shadow-sm">
                {card.icon}
              </span>
              <div>
                <p className="text-base font-semibold text-slate-900">{card.title}</p>
                <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${card.chip}`}>
                  {card.subtitle}
                </span>
              </div>
            </div>
            <p className="text-sm text-slate-500">{card.desc}</p>
            <span className="mt-1 text-sm font-medium text-slate-700">进入 Dashboard →</span>
          </Link>
        ))}
      </div>

      <div className="mx-auto max-w-5xl px-6 pb-20">
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-slate-700">公共页面预览</p>
          <div className="flex flex-wrap gap-2">
            {publicLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600 transition hover:border-emerald-300 hover:text-emerald-600"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <p className="mt-4 text-xs text-slate-400">
            本页面为开发 Demo 入口，所有数据均为 Mock 数据，用于预览三种角色的界面与页面流程。进入任一角色后，可通过页面右上角 / 侧边栏的角色切换器（🌸 🌿 🛡️）快速切换查看。
          </p>
        </div>
      </div>
    </div>
  );
}
