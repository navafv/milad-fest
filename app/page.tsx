// app/page.tsx

import Link from "next/link";
import { getTeamLeaderboard } from "./(tenant)/(public)/actions/public-actions";
import { resolvePublicMadrassaId } from "@/lib/utils/resolve-tenant";
import LeaderboardClient from "./(tenant)/(public)/leaderboard-client";

// This route resolves its tenant from a per-request header
// (x-madrassa-subdomain), not from a static route param — so it must
// always be rendered dynamically. Do NOT reintroduce `export const
// revalidate = N` here: Next.js's Full Route Cache is keyed by URL path,
// and the bare "/" path is shared by every tenant using the cookie-based
// flow. A time-based revalidate would cache one tenant's leaderboard and
// serve it to the next tenant that hits "/" within the revalidate window.
export const dynamic = "force-dynamic";

function WelcomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-slate-50">
      <div className="text-center space-y-6 max-w-2xl">
        <h1 className="text-5xl font-bold text-slate-900">Welcome to Milad Fest</h1>
        <p className="text-xl text-slate-600">
          The ultimate platform for managing events, schedules, and results.
        </p>

        <div className="flex flex-wrap gap-4 justify-center pt-8">
          <Link
            href="/schedule"
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
          >
            View Public Schedule
          </Link>
          <Link
            href="/admin/login"
            className="px-6 py-3 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition"
          >
            Admin Access
          </Link>
          <Link
            href="/judge/login"
            className="px-6 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition"
          >
            Judge Portal
          </Link>
        </div>
      </div>
    </main>
  );
}

export default async function RootPage() {
  const madrassaId = await resolvePublicMadrassaId();

  // No tenant resolved (bare platform domain, no ?tenant= and no
  // active_tenant cookie yet) — show the generic marketing/landing page.
  if (!madrassaId) {
    return <WelcomePage />;
  }

  // A tenant IS resolved — show that tenant's leaderboard.
  const result = await getTeamLeaderboard(madrassaId);

  const teams = result.success && result.data ? result.data : [];
  const error = result.success ? null : result.message ?? "Failed to load leaderboard.";

  return (
    <div className="px-6 py-10 max-w-3xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-black text-white tracking-tight mb-2">Team Leaderboard</h1>
        <p className="text-slate-400 text-sm">Live standings across all events</p>
      </div>

      {error && (
        <p className="text-red-300 text-sm mb-6 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-center">
          {error}
        </p>
      )}

      {!error && teams.length === 0 && (
        <p className="text-slate-500 text-center text-sm">No results published yet. Check back soon.</p>
      )}

      <LeaderboardClient teams={teams} />
    </div>
  );
}