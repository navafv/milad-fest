import { getTeamLeaderboard } from './actions/public-actions';
import LeaderboardClient from './leaderboard-client';

export const revalidate = 30;

interface PageProps {
  params: Promise<{ madrassaId: string }>;
}

export default async function PublicHomePage({ params }: PageProps) {
  const { madrassaId } = await params;

  const result = await getTeamLeaderboard(madrassaId);

  const teams = result.success && result.data ? result.data : [];
  const error = result.success ? null : result.message ?? 'Failed to load leaderboard.';

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
