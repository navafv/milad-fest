import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Users,
  CalendarClock,
  Trophy,
  Download,
  Settings,
  UploadCloud,
  Wand2,
  ClipboardCheck,
  IdCard,
  type LucideIcon,
} from "lucide-react";
import { verifySession } from "../actions/auth-actions";
import { getMadrassaSettings } from "../actions/settings-actions";

export const dynamic = "force-dynamic";

interface QuickAction {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    href: "/admin/students",
    title: "Add Students",
    description: "Bulk-import students via CSV, and set up teams and categories.",
    icon: UploadCloud,
    accent: "from-indigo-500/15 to-indigo-500/0 text-indigo-300 ring-indigo-500/25",
  },
  {
    href: "/admin/events",
    title: "Schedule Events",
    description: "Create events, generate squads & code letters, and build the stage schedule.",
    icon: CalendarClock,
    accent: "from-sky-500/15 to-sky-500/0 text-sky-300 ring-sky-500/25",
  },
  {
    href: "/admin/events",
    title: "Generate Code Letters",
    description: "Assign code letters to participants and squads for blind judging.",
    icon: Wand2,
    accent: "from-fuchsia-500/15 to-fuchsia-500/0 text-fuchsia-300 ring-fuchsia-500/25",
  },
  {
    href: "/admin/results",
    title: "Publish Results",
    description: "Audit scoreboards, resolve ties, and publish results to the public portal.",
    icon: ClipboardCheck,
    accent: "from-emerald-500/15 to-emerald-500/0 text-emerald-300 ring-emerald-500/25",
  },
  {
    href: "/admin/exports",
    title: "Export & Print",
    description: "Download results as CSV, print student ID cards, and issue certificates.",
    icon: IdCard,
    accent: "from-amber-500/15 to-amber-500/0 text-amber-300 ring-amber-500/25",
  },
  {
    href: "/admin/settings",
    title: "Fest Settings",
    description: "Update your fest name, logo, and admin account password.",
    icon: Settings,
    accent: "from-slate-500/15 to-slate-500/0 text-slate-300 ring-slate-500/25",
  },
];

function StatCard({
  icon: Icon,
  label,
  href,
}: {
  icon: LucideIcon;
  label: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 transition hover:bg-white/[0.07]"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
        <Icon className="h-5 w-5 text-slate-300" />
      </div>
      <div>
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="text-xs text-slate-500">Manage &rarr;</p>
      </div>
    </Link>
  );
}

export default async function AdminDashboardPage() {
  const session = await verifySession();
  if (!session) {
    redirect("/admin/login");
  }

  const { data: settings } = await getMadrassaSettings(session.madrassa_id);
  const festName = settings?.name?.trim();
  const subdomain = settings?.subdomain;

  return (
    <div className="min-h-screen bg-slate-950">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="border-b border-white/5 bg-slate-950 px-6 py-8 sm:px-10">
        <div className="mx-auto max-w-6xl">
          <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-400">
            {subdomain ? `${subdomain}.miladnabi.vercel.app` : "Milad Fest"}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
            Welcome back{festName ? `, ${festName}` : ""} 👋
          </h1>
          <p className="mt-1.5 text-sm text-slate-400">
            Here&rsquo;s a quick jump-off point to manage your fest — students, events, judging, and results.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-10 px-6 py-10 sm:px-10">
        {/* ── Shortcuts row ───────────────────────────────────────────── */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard icon={Users} label="Students & Teams" href="/admin/students" />
          <StatCard icon={CalendarClock} label="Events & Schedule" href="/admin/events" />
          <StatCard icon={Trophy} label="Results Audit" href="/admin/results" />
        </section>

        {/* ── Quick Actions grid ──────────────────────────────────────── */}
        <section>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Quick Actions</h2>
              <p className="mt-0.5 text-sm text-slate-500">
                Jump straight into the most common admin tasks.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.title}
                  href={action.href}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-white/20 hover:bg-white/[0.07]"
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-br opacity-60 ${action.accent.split(" ").slice(0, 2).join(" ")}`}
                  />
                  <div className="relative">
                    <div
                      className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 ring-1 ${action.accent
                        .split(" ")
                        .find((c) => c.startsWith("ring-"))}`}
                    >
                      <Icon className={`h-5 w-5 ${action.accent.split(" ").find((c) => c.startsWith("text-"))}`} />
                    </div>
                    <h3 className="text-sm font-bold text-white">{action.title}</h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{action.description}</p>
                    <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-slate-300 transition group-hover:gap-2 group-hover:text-white">
                      Go
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ── Getting started tip ─────────────────────────────────────── */}
        <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-6 py-5">
          <h3 className="text-sm font-bold text-emerald-300">Getting started</h3>
          <p className="mt-1 text-xs leading-relaxed text-emerald-200/70">
            New to Milad Fest? A typical setup flow looks like this: create your{" "}
            <Link href="/admin/students" className="underline underline-offset-2 hover:text-emerald-200">
              teams and categories
            </Link>
            , bulk-import your{" "}
            <Link href="/admin/students" className="underline underline-offset-2 hover:text-emerald-200">
              students
            </Link>
            , set up your{" "}
            <Link href="/admin/events" className="underline underline-offset-2 hover:text-emerald-200">
              events and stage schedule
            </Link>
            , generate squads &amp; code letters, then once judging wraps up, head to{" "}
            <Link href="/admin/results" className="underline underline-offset-2 hover:text-emerald-200">
              Results Audit
            </Link>{" "}
            to publish final standings.
          </p>
        </section>
      </main>
    </div>
  );
}
