import type { PublishedEventResult } from '../actions/public-actions';
import { getPublishedResults } from '../actions/public-actions';
import { resolvePublicMadrassaId } from '@/lib/utils/resolve-tenant';

// This route resolves its tenant from a per-request header
// (x-madrassa-subdomain), not from a static route param — so it must
// always be rendered dynamically. There is no [madrassaId] segment in
// this route, so the old `generateStaticParams` / `params` approach never
// worked and has been removed.
export const dynamic = 'force-dynamic';

function medalStyle(rank: number) {
  switch (rank) {
    case 1:
      return 'bg-yellow-500/15 text-yellow-300 border-yellow-400/30';
    case 2:
      return 'bg-slate-400/15 text-slate-200 border-slate-400/30';
    case 3:
      return 'bg-orange-500/15 text-orange-300 border-orange-500/30';
    default:
      return 'bg-white/5 text-slate-400 border-white/10';
  }
}

function medalLabel(rank: number) {
  switch (rank) {
    case 1:
      return '1st';
    case 2:
      return '2nd';
    case 3:
      return '3rd';
    default:
      return `${rank}th`;
  }
}

export default async function PublicResultsPage() {
  const madrassaId = await resolvePublicMadrassaId();

  if (!madrassaId) {
    return (
      <div className="px-6 py-10 max-w-3xl mx-auto text-center">
        <p className="text-slate-400 text-sm">
          Festival not found. Please check your link and try again.
        </p>
      </div>
    );
  }

  const result = await getPublishedResults(madrassaId);

  const results: PublishedEventResult[] = result.success && result.data ? result.data : [];
  const error = result.success ? null : result.message ?? 'Failed to load results.';

  return (
    <div className="px-6 py-10 max-w-3xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-black text-white tracking-tight mb-2">Published Results</h1>
        <p className="text-slate-400 text-sm">Winners from each completed event</p>
      </div>

      {error && (
        <p className="text-red-300 text-sm mb-6 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-center">
          {error}
        </p>
      )}

      {!error && results.length === 0 && (
        <p className="text-slate-500 text-center text-sm">No results have been published yet.</p>
      )}

      <div className="flex flex-col gap-5">
        {results.map((event) => (
          <div key={event.eventId} className="bg-white/5 border border-white/10 rounded-2xl px-5 py-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-white font-bold text-lg">{event.eventName}</h2>
                {event.category && <p className="text-slate-500 text-xs mt-0.5">{event.category}</p>}
              </div>
              {event.publishedAt && (
                <span className="text-xs text-slate-500">
                  {new Date(event.publishedAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {event.winners.map((winner) => (
                <div
                  key={`${winner.participantType}:${winner.participantId}`}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 ${medalStyle(
                    winner.finalRank
                  )}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold uppercase tracking-wide">
                      {medalLabel(winner.finalRank)}
                    </span>
                    <span className="font-semibold">
                      {winner.displayName ?? winner.codeLetter}
                    </span>
                    <span className="text-xs opacity-60">({winner.codeLetter})</span>
                  </div>
                  <span className="text-xs font-medium opacity-80">
                    {winner.pointsAwarded} pts
                  </span>
                </div>
              ))}

              {event.winners.length === 0 && (
                <p className="text-slate-500 text-sm text-center py-2">No winners recorded.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
