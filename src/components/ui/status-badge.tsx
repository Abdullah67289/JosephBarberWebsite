import { Badge, type BadgeProps } from "./badge";
import { humanize } from "@/lib/utils";

const MAP: Record<string, BadgeProps["variant"]> = {
  // bookings
  pending: "warning",
  confirmed: "default",
  completed: "success",
  cancelled: "danger",
  no_show: "danger",
  rescheduled: "secondary",
  // orders
  paid: "success",
  fulfilled: "success",
  refunded: "muted",
  unfulfilled: "warning",
  ready: "default",
  unpaid: "warning",
  // messages
  new: "default",
  read: "muted",
  archived: "muted",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge variant={MAP[status] ?? "secondary"}>{humanize(status)}</Badge>;
}
