"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { messageThreads } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const mockConversation = [
  { from: "customer", text: "教练，我这周体重都没什么变化，有点担心😟" },
  { from: "coach", text: "别担心，体重停滞是很常见的现象，我们先看看这几天的饮食记录～" },
  { from: "customer", text: "好的，谢谢教练！" },
];

export default function MessagesPage() {
  const [selectedId, setSelectedId] = useState(messageThreads[0].id);
  const [draft, setDraft] = useState("");
  const selected = messageThreads.find((t) => t.id === selectedId)!;

  return (
    <div className="flex flex-col gap-4 px-4 pb-8 md:px-8">
      <PageHeader title="消息" subtitle={`${messageThreads.filter((t) => t.unread > 0).length} 个未读会话`} />

      <div className="grid gap-4 md:grid-cols-[280px_1fr]">
        <div className="flex flex-col gap-2">
          {messageThreads.map((thread) => (
            <button
              key={thread.id}
              onClick={() => setSelectedId(thread.id)}
              className={cn(
                "flex items-center gap-3 rounded-2xl border p-3.5 text-left shadow-sm transition",
                selectedId === thread.id ? "border-sky-300 bg-sky-50" : "border-slate-100 bg-white hover:border-sky-200",
              )}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-xl shadow-sm">
                {thread.avatar}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-slate-800">{thread.customerName}</p>
                  <span className="shrink-0 text-[11px] text-slate-400">{thread.lastTime}</span>
                </div>
                <p className="truncate text-xs text-slate-500">{thread.lastMessage}</p>
              </div>
              {thread.unread > 0 && (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-400 text-[11px] font-semibold text-white">
                  {thread.unread}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex flex-col rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-50 p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-50 text-xl">{selected.avatar}</span>
            <p className="text-sm font-semibold text-slate-800">{selected.customerName}</p>
          </div>
          <div className="flex flex-1 flex-col gap-3 p-4">
            {mockConversation.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm",
                  msg.from === "coach" ? "self-end bg-sky-500 text-white" : "self-start bg-slate-100 text-slate-700",
                )}
              >
                {msg.text}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 border-t border-slate-50 p-3">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="输入消息…"
              className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
            <button
              type="button"
              onClick={() => setDraft("")}
              className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-600"
            >
              发送
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
