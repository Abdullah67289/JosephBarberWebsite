"use client";

import * as React from "react";
import { Mail, MailOpen, Archive, Trash2, Phone } from "lucide-react";
import { updateMessageStatus, deleteMessage } from "@/server/content-actions";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { AdminPageHeader } from "./admin-page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDelete } from "./confirm-delete";
import { useAction } from "./use-action";

type Message = { id: string; name: string; email: string; phone: string | null; subject: string | null; message: string; status: string; createdAt: string };

export function MessagesManager({ messages }: { messages: Message[] }) {
  const { run } = useAction();
  const [openId, setOpenId] = React.useState<string | null>(null);

  return (
    <div>
      <AdminPageHeader title="Messages" description="Enquiries submitted through the contact form." />
      {messages.length === 0 ? (
        <EmptyState icon={Mail} title="No messages" description="Contact form submissions will appear here." />
      ) : (
        <div className="space-y-3">
          {messages.map((m) => {
            const open = openId === m.id;
            return (
              <div key={m.id} className="premium-card">
                <button
                  className="relative z-10 flex w-full items-center gap-4 p-4 text-left"
                  onClick={() => {
                    setOpenId(open ? null : m.id);
                    if (m.status === "new") void run(() => updateMessageStatus(m.id, "read"));
                  }}
                >
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${m.status === "new" ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"}`}>
                    {m.status === "new" ? <Mail className="h-4 w-4" /> : <MailOpen className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{m.name}</p>
                      <StatusBadge status={m.status} />
                    </div>
                    <p className="truncate text-sm text-muted-foreground">{m.subject || m.message}</p>
                  </div>
                  <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
                    {new Date(m.createdAt).toLocaleDateString()}
                  </span>
                </button>
                {open && (
                  <div className="relative z-10 border-t border-border p-4 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="mb-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <a href={`mailto:${m.email}`} className="flex items-center gap-1.5 hover:text-primary"><Mail className="h-4 w-4" /> {m.email}</a>
                      {m.phone && <a href={`tel:${m.phone}`} className="flex items-center gap-1.5 hover:text-primary"><Phone className="h-4 w-4" /> {m.phone}</a>}
                    </div>
                    {m.subject && <p className="mb-1 font-medium">{m.subject}</p>}
                    <p className="whitespace-pre-wrap text-sm">{m.message}</p>
                    <div className="mt-4 flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => run(() => updateMessageStatus(m.id, m.status === "archived" ? "read" : "archived"), { success: "Updated." })}>
                        <Archive className="h-4 w-4" /> {m.status === "archived" ? "Unarchive" : "Archive"}
                      </Button>
                      <ConfirmDelete title="Delete message?" onConfirm={() => deleteMessage(m.id)} success="Message deleted." trigger={<Button variant="ghost" size="sm" className="text-muted-foreground hover:text-red-400"><Trash2 className="h-4 w-4" /> Delete</Button>} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
