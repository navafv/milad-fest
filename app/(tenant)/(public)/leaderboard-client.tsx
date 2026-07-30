'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { TeamLeaderboardEntry } from './actions/public-actions';

interface LeaderboardClientProps {
  teams: TeamLeaderboardEntry[];
}

export default function LeaderboardClient({ teams }: LeaderboardClientProps) {
  const searchParams = useSearchParams();
  const revealMode = searchParams.get('reveal') === 'true';

  const [showReveal, setShowReveal] = useState(revealMode);

  const maxPoints = useMemo(
    () => (teams.length > 0 ? Math.max(...teams.map((t) => t.totalPoints), 1) : 1),
    [teams]
  );

  const championTeam = teams.find((t) => t.rank === 1) ?? null;

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
    <>
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
    </>
  );
}
