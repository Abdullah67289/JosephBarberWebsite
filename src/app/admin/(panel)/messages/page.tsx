import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { MessagesManager } from "@/components/admin/messages-manager";

export const dynamic = "force-dynamic";

export default async function AdminMessagesPage() {
  await requirePermission("manage_messages");
  const rows = await db.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <MessagesManager
      messages={rows.map((m) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        phone: m.phone,
        subject: m.subject,
        message: m.message,
        status: m.status,
        createdAt: m.createdAt.toISOString(),
      }))}
    />
  );
}
