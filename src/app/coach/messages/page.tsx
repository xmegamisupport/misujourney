"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { useMyCustomers } from "@/lib/coach/hooks";
import { normalizeWhatsAppNumber, buildWhatsAppLink, buildCustomerContactMessage } from "@/lib/whatsapp";

/** Real in-app chat would need its own message table + RLS + realtime —
 * deferred for now. This reuses the same wa.me deep-link pattern already
 * built for the customer-side "联系Coach" button, just in the other
 * direction, so Coach can reach a customer with zero new backend. */
export default function CoachContactCustomersPage() {
  const { user } = useAuthUser();
  const coachId = user?.id ?? "";
  const { data: customers, loading } = useMyCustomers(coachId);

  return (
    <div className="flex flex-col gap-4 px-4 pb-8 md:px-8">
      <PageHeader title="联系顾客" subtitle="通过 WhatsApp 联系你的顾客" />

      {!loading && customers.length === 0 ? (
        <EmptyState icon="💬" title="还没有绑定的顾客" />
      ) : (
        <div className="flex flex-col gap-2">
          {customers.map((customer) => {
            const whatsappNumber = customer.phone ? normalizeWhatsAppNumber(customer.phone) : null;
            return (
              <div key={customer.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-50 text-xl">{customer.avatar ?? "🙂"}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{customer.name}</p>
                  <p className="text-xs text-slate-400">{customer.phone ?? "尚未填写电话号码"}</p>
                </div>
                {whatsappNumber ? (
                  <a
                    href={buildWhatsAppLink(whatsappNumber, buildCustomerContactMessage(customer.name))}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded-full bg-emerald-500 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600"
                  >
                    💬 WhatsApp
                  </a>
                ) : (
                  <span className="shrink-0 rounded-full bg-slate-100 px-3.5 py-1.5 text-xs font-medium text-slate-400">未设置号码</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
