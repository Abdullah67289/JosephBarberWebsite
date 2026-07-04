"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Scissors,
  Users,
  Clock,
  ShoppingBag,
  Package,
  Image as ImageIcon,
  Star,
  MessageSquare,
  Settings,
  UserCog,
  UserCircle,
  Activity,
  Bell,
  PanelsTopLeft,
  Menu,
  X,
  LogOut,
  ExternalLink,
} from "lucide-react";
import { logoutAction } from "@/server/auth-actions";
import { type Role } from "@/lib/auth-jwt";
import { cn } from "@/lib/utils";

// `access`: a permission key gates the item by grant; "always" shows for every
// signed-in user; "owner" shows only for the owner.
type Access = string;
type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; access: Access };
type NavGroup = { heading?: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard, access: "always" }],
  },
  {
    heading: "Operations",
    items: [
      { href: "/admin/bookings", label: "Bookings", icon: CalendarDays, access: "manage_bookings" },
      { href: "/admin/availability", label: "Schedule", icon: Clock, access: "manage_schedule" },
      { href: "/admin/staff", label: "Barbers", icon: Users, access: "manage_staff" },
      { href: "/admin/services", label: "Services", icon: Scissors, access: "manage_services" },
    ],
  },
  {
    heading: "Website",
    items: [
      { href: "/admin/content", label: "Website Content", icon: PanelsTopLeft, access: "manage_content" },
      { href: "/admin/products", label: "Shop", icon: Package, access: "manage_shop" },
      { href: "/admin/orders", label: "Orders", icon: ShoppingBag, access: "manage_orders" },
      { href: "/admin/gallery", label: "Gallery", icon: ImageIcon, access: "manage_gallery" },
      { href: "/admin/reviews", label: "Reviews", icon: Star, access: "manage_reviews" },
    ],
  },
  {
    heading: "Inbox & system",
    items: [
      { href: "/admin/messages", label: "Messages", icon: MessageSquare, access: "manage_messages" },
      { href: "/admin/activity", label: "Activity Log", icon: Activity, access: "owner" },
      { href: "/admin/team", label: "Manage Team", icon: UserCog, access: "owner" },
      { href: "/admin/settings", label: "Settings", icon: Settings, access: "owner" },
      { href: "/admin/account", label: "My Account", icon: UserCircle, access: "always" },
    ],
  },
];

export function AdminShell({
  session,
  grants,
  notifications,
  children,
}: {
  session: { name: string; email: string; role: Role; isDevBypass?: boolean };
  grants: string[];
  notifications?: { pendingBookings: number; newMessages: number };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const isOwner = session.role === "OWNER" || Boolean(session.isDevBypass);
  const grantSet = React.useMemo(() => new Set(grants), [grants]);
  const canAccess = (access: Access) =>
    access === "always" || (access === "owner" ? isOwner : isOwner || grantSet.has(access));
  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((n) => canAccess(n.access)),
  })).filter((g) => g.items.length > 0);

  React.useEffect(() => setMobileOpen(false), [pathname]);

  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));
  const currentLabel = NAV_GROUPS.flatMap((g) => g.items).find((i) => isActive(i.href))?.label ?? "Dashboard";

  const NavList = () => (
    <nav className="flex flex-col gap-5">
      {groups.map((group, gi) => (
        <div key={group.heading ?? gi} className="flex flex-col gap-1">
          {group.heading && (
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">
              {group.heading}
            </p>
          )}
          {group.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 hover:-translate-y-0.5",
                isActive(item.href)
                  ? "bg-primary/[0.12] text-primary shadow-[inset_3px_0_0_hsl(var(--primary)),0_16px_44px_-32px_hsl(var(--primary)/0.9)]"
                  : "text-muted-foreground hover:bg-secondary/75 hover:text-foreground",
              )}
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.label}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background p-0 lg:bg-[radial-gradient(circle_at_16%_0%,hsl(var(--primary)/0.13),transparent_28%),radial-gradient(circle_at_82%_12%,hsl(0_0%_100%/0.055),transparent_24%),hsl(var(--background))] lg:p-4">
      {/* Desktop sidebar */}
      <div className="min-h-screen lg:grid lg:min-h-[calc(100vh-2rem)] lg:grid-cols-[280px_1fr] lg:gap-4">
      <aside className="hidden overflow-hidden border border-border bg-card/95 shadow-[0_26px_90px_-54px_rgb(0_0_0/0.95)] backdrop-blur-xl lg:flex lg:flex-col lg:rounded-[1.5rem]">
        <div className="flex h-20 items-center gap-2.5 border-b border-border px-5">
          <span className="relative grid h-8 w-8 place-items-center overflow-hidden rounded-md border border-primary/40">
            <span className="absolute inset-0 barber-pole opacity-80" aria-hidden />
            <span className="relative z-10 font-display text-xs font-bold text-background">JM</span>
          </span>
          <div>
            <span className="block font-display text-sm font-bold leading-tight">Joseph &amp; Mike&apos;s</span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-primary">Control panel</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <NavList />
        </div>
        <SidebarFooter session={session} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 animate-in fade-in duration-150 lg:hidden"
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-card shadow-card-hover animate-in slide-in-from-left duration-300 lg:hidden">
            <div className="flex h-16 items-center justify-between border-b border-border px-5">
              <span className="font-display text-sm font-bold">Joseph &amp; Mike&apos;s</span>
              <button onClick={() => setMobileOpen(false)} aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <NavList />
            </div>
            <SidebarFooter session={session} />
          </aside>
        </>
      )}

      {/* Main */}
      <div className="flex min-h-screen flex-col bg-background lg:min-h-[calc(100vh-2rem)] lg:overflow-hidden lg:rounded-[1.5rem] lg:border lg:border-border lg:bg-background/90 lg:shadow-[0_26px_90px_-58px_rgb(0_0_0/0.92)] lg:backdrop-blur-xl">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur-xl lg:h-20 lg:px-8">
          <button className="grid h-10 w-10 place-items-center rounded-md border border-border lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <p className="font-display text-base font-semibold lg:text-lg">{currentLabel}</p>
          <div className="flex items-center gap-3">
            {notifications && <NotificationBell {...notifications} canBookings={isOwner || grantSet.has("manage_bookings")} canMessages={isOwner || grantSet.has("manage_messages")} />}
            <Link href="/" target="_blank" className="hidden items-center gap-1.5 rounded-xl border border-border bg-card/70 px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground sm:flex">
              <ExternalLink className="h-4 w-4" /> View site
            </Link>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight">{session.name}</p>
              <p className="text-xs capitalize text-muted-foreground">{session.role.toLowerCase()}</p>
            </div>
            <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 font-display text-sm font-bold text-primary">
              {session.name.charAt(0)}
            </div>
          </div>
        </header>
        {session.isDevBypass && (
          <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-100 lg:px-8">
            Development admin bypass is active. Turn off ALLOW_DEV_ADMIN_BYPASS before production.
          </div>
        )}
        <main
          key={pathname}
          className="flex-1 overflow-x-hidden px-4 py-6 animate-in fade-in slide-in-from-bottom-1 duration-200 lg:overflow-y-auto lg:px-8 lg:py-8"
        >
          {children}
        </main>
      </div>
      </div>
    </div>
  );
}

function NotificationBell({
  pendingBookings,
  newMessages,
  canBookings,
  canMessages,
}: {
  pendingBookings: number;
  newMessages: number;
  canBookings: boolean;
  canMessages: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const items = [
    canBookings && pendingBookings > 0
      ? { href: "/admin/bookings?status=pending", label: `${pendingBookings} booking${pendingBookings === 1 ? "" : "s"} pending confirmation` }
      : null,
    canMessages && newMessages > 0
      ? { href: "/admin/messages", label: `${newMessages} new message${newMessages === 1 ? "" : "s"}` }
      : null,
  ].filter(Boolean) as { href: string; label: string }[];
  const count = items.length ? pendingBookings * (canBookings ? 1 : 0) + newMessages * (canMessages ? 1 : 0) : 0;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative grid h-9 w-9 place-items-center rounded-full border border-border bg-card/70 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        aria-label="Notifications"
      >
        <Bell className="h-[18px] w-[18px]" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 top-11 z-50 w-72 rounded-xl border border-border bg-card p-2 shadow-2xl animate-in fade-in slide-in-from-top-1 duration-150">
            {items.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">You&apos;re all caught up.</p>
            ) : (
              items.map((it) => (
                <Link key={it.href} href={it.href} onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg p-3 text-sm transition-colors hover:bg-secondary">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                  {it.label}
                </Link>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

function SidebarFooter({ session }: { session: { name: string; email: string } }) {
  return (
    <div className="border-t border-border p-4">
      <div className="mb-3 rounded-2xl border border-border bg-background/50 p-3">
        <p className="truncate text-sm font-medium">{session.name}</p>
        <p className="truncate text-xs text-muted-foreground">{session.email}</p>
      </div>
      <form action={logoutAction}>
        <button type="submit" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
          <LogOut className="h-[18px] w-[18px]" /> Sign out
        </button>
      </form>
    </div>
  );
}
