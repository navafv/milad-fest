"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarClock,
  Trophy,
  Download,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { logoutTenantAdmin } from "./actions/auth-actions";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/students", label: "Students & Teams", icon: Users },
  { href: "/admin/events", label: "Events & Schedule", icon: CalendarClock },
  { href: "/admin/results", label: "Results Audit", icon: Trophy },
  { href: "/admin/exports", label: "Exports & Printables", icon: Download },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Logo() {
  return (
    <Link href="/admin/dashboard" className="flex items-center gap-2.5 px-1">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500 shadow-lg shadow-emerald-900/40">
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-emerald-950" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3L2 9l10 6 10-6-10-6zM2 15l10 6 10-6" />
        </svg>
      </div>
      <div className="leading-tight">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">Milad Fest</p>
        <p className="text-sm font-bold text-white">Admin Portal</p>
      </div>
    </Link>
  );
}

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/25"
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Icon
              className={`h-[18px] w-[18px] shrink-0 transition-colors ${
                active ? "text-emerald-400" : "text-slate-500 group-hover:text-slate-300"
              }`}
            />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function LogoutButton({ full }: { full?: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(async () => {
      await logoutTenantAdmin();
      router.push("/admin/login");
    });
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isPending}
      className={`flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm font-semibold text-rose-300 transition hover:border-rose-500/30 hover:bg-rose-500/10 disabled:opacity-60 ${
        full ? "w-full justify-center" : "w-full"
      }`}
    >
      <LogOut className="h-[18px] w-[18px]" />
      {isPending ? "Signing out…" : "Logout"}
    </button>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // A festival admin app has no business following OS light/dark toggling —
  // every admin page (Events, Students, Results, Settings, Exports, Login)
  // is designed against the dark glass system in globals.css, so force it
  // here rather than relying on each page to opt in individually.
  return (
    <div className="dark min-h-screen bg-background">
      <div className="flex min-h-screen bg-slate-950">
        {/* ── Desktop Sidebar ─────────────────────────────────────────── */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-white/5 bg-slate-950 px-4 py-6 lg:flex">
          <div className="mb-8">
            <Logo />
          </div>
          <NavLinks pathname={pathname} />
          <div className="mt-6 border-t border-white/5 pt-4">
            <LogoutButton />
          </div>
        </aside>

        {/* ── Mobile Top Navbar ───────────────────────────────────────── */}
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/5 bg-slate-950/90 px-4 py-3.5 backdrop-blur-lg lg:hidden">
            <Logo />
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10"
            >
              <Menu className="h-5 w-5" />
            </button>
          </header>

          {/* ── Mobile Drawer ───────────────────────────────────────── */}
          {mobileOpen && (
            <div className="fixed inset-0 z-40 lg:hidden">
              <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={() => setMobileOpen(false)}
                aria-hidden="true"
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Admin navigation"
                className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col border-r border-white/10 bg-slate-950 px-4 py-6 shadow-2xl"
              >
                <div className="mb-8 flex items-center justify-between">
                  <Logo />
                  <button
                    onClick={() => setMobileOpen(false)}
                    aria-label="Close navigation menu"
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <NavLinks pathname={pathname} onNavigate={() => setMobileOpen(false)} />
                <div className="mt-6 border-t border-white/5 pt-4">
                  <LogoutButton full />
                </div>
              </div>
            </div>
          )}

          {/* ── Page Content ────────────────────────────────────────── */}
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
