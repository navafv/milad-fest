'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { getTeamLeaderboard, type TeamLeaderboardEntry } from './actions/public-actions';

export default function PublicHomePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const madrassaId = (params?.madrassaId as string) ?? '';
  const revealMode = searchParams.get('reveal') === 'true';

  const [teams, setTeams] = useState<TeamLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReveal, setShowReveal] = useState(revealMode);

  useEffect(() => {
    (async () => {
      const result = await getTeamLeaderboard(madrassaId);
      if (result.success && result.data) {
        setTeams(result.data);
      } else {
        setError(result.message ?? 'Failed to load leaderboard.');
      }
      setLoading(false);
    })();
  }, [madrassaId]);

  const maxPoints = useMemo(
    () => (teams.length > 0 ? Math.max(...teams.map((t) => t.totalPoints), 1) : 1),
    [teams]
  );

  const championTeam = teams.find((t) => t.rank === 1) ?? null;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-4 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  if (showReveal && championTeam) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-emerald-950 via-slate-950 to-slate-950 px-6 overflow-hidden">
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute top-10 left-10 h-72 w-72 bg-emerald-500/30 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 h-72 w-72 bg-yellow-500/20 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center animate-pulse">
          <span className="text-emerald-300/70 text-sm uppercase tracking-[0.3em] mb-4">
            Champion Team
          </span>
        </div>

        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="h-24 w-24 rounded-full bg-yellow-500/15 border-2 border-yellow-400/40 flex items-center justify-center mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 text-yellow-400"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm0 2h14v2H5v-2z" />
            </svg>
          </div>
          <h1 className="text-5xl sm:text-6xl font-black text-white tracking-tight mb-3">
            {championTeam.teamName}
          </h1>
          <p className="text-emerald-300 text-xl font-semibold mb-8">
            {championTeam.totalPoints} Points &middot; 1st Place
          </p>

          <button
            onClick={() => setShowReveal(false)}
            className="rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-medium px-6 py-3 transition active:scale-[0.98]"
          >
            View Full Leaderboard
          </button>
        </div>
      </div>
    );
  }

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

      {championTeam && (
        <button
          onClick={() => setShowReveal(true)}
          className="w-full mb-6 rounded-2xl bg-gradient-to-r from-yellow-500/15 to-emerald-500/15 border border-yellow-400/25 px-5 py-4 text-left hover:from-yellow-500/20 hover:to-emerald-500/20 transition active:scale-[0.99]"
        >
          <span className="text-yellow-300 text-xs uppercase tracking-widest font-semibold">
            Tap for Grand Reveal
          </span>
          <p className="text-white text-sm mt-1">See the championship announcement for {championTeam.teamName}</p>
        </button>
      )}

      <div className="flex flex-col gap-3">
        {teams.map((team) => (
          <div
            key={team.teamId}
            className={`rounded-2xl border px-5 py-4 ${
              team.rank === 1
                ? 'bg-yellow-500/10 border-yellow-400/30'
                : team.rank === 2
                ? 'bg-slate-400/10 border-slate-400/25'
                : team.rank === 3
                ? 'bg-orange-500/10 border-orange-500/25'
                : 'bg-white/5 border-white/10'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span
                  className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold ${
                    team.rank === 1
                      ? 'bg-yellow-500/20 text-yellow-300'
                      : team.rank === 2
                      ? 'bg-slate-400/20 text-slate-200'
                      : team.rank === 3
                      ? 'bg-orange-500/20 text-orange-300'
                      : 'bg-white/10 text-slate-400'
                  }`}
                >
                  {team.rank}
                </span>
                <span className="text-white font-semibold">{team.teamName}</span>
              </div>
              <span className="text-emerald-400 font-bold">{team.totalPoints} pts</span>
            </div>

            <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  team.rank === 1
                    ? 'bg-yellow-400'
                    : team.rank === 2
                    ? 'bg-slate-300'
                    : team.rank === 3
                    ? 'bg-orange-400'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.max((team.totalPoints / maxPoints) * 100, 3)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
