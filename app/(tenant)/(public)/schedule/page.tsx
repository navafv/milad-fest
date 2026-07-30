import type { ScheduleItem } from '../actions/public-actions';
import { getPublicSchedule } from '../actions/public-actions';
import { resolvePublicMadrassaId } from '@/lib/utils/resolve-tenant';

// This route resolves its tenant from a per-request header
// (x-madrassa-subdomain), not from a static route param — so it must
// always be rendered dynamically. The previous `export const revalidate = 60`
// cached this page by URL path only, which meant one tenant's schedule could
// be served to the next tenant that hit "/schedule" within the revalidate
// window. Do not reintroduce a time-based `revalidate` here.
export const dynamic = 'force-dynamic';

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function statusBadge(status: string) {
  const base = 'text-xs px-2.5 py-1 rounded-full font-medium border';
  switch (status) {
    case 'live':
      return `${base} bg-red-500/15 text-red-300 border-red-500/25`;
    case 'completed':
    case 'published':
      return `${base} bg-emerald-500/15 text-emerald-300 border-emerald-500/25`;
    default:
      return `${base} bg-white/10 text-slate-300 border-white/15`;
  }
}

function groupByDay(schedule: ScheduleItem[]): [string, ScheduleItem[]][] {
  const groups = new Map<string, ScheduleItem[]>();
  for (const item of schedule) {
    const day = new Date(item.startTime).toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
    if (!groups.has(day)) groups.set(day, []);
    groups.get(day)!.push(item);
  }
  return Array.from(groups.entries());
}

export default async function PublicSchedulePage() {
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

  const result = await getPublicSchedule(madrassaId);

  const schedule: ScheduleItem[] = result.success && result.data ? result.data : [];
  const error = result.success ? null : result.message ?? 'Failed to load schedule.';
  const groupedSchedule = groupByDay(schedule);

  return (
    <div className="px-6 py-10 max-w-3xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-black text-white tracking-tight mb-2">Event Schedule</h1>
        <p className="text-slate-400 text-sm">When and where each event is happening</p>
      </div>

      {error && (
        <p className="text-red-300 text-sm mb-6 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-center">
          {error}
        </p>
      )}

      {!error && schedule.length === 0 && (
        <p className="text-slate-500 text-center text-sm">No events have been scheduled yet.</p>
      )}

      <div className="flex flex-col gap-8">
        {groupedSchedule.map(([day, items]) => (
          <div key={day}>
            <h2 className="text-white font-bold text-sm uppercase tracking-widest mb-3">{day}</h2>
            <div className="flex flex-col gap-2">
              {items.map((item) => (
                <div
                  key={item.eventId}
                  className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3"
                >
                  <div className="flex flex-col">
                    <span className="text-white font-semibold text-sm">{item.eventName}</span>
                    <span className="text-slate-500 text-xs mt-0.5">
                      {item.category ?? 'General'}
                      {item.stageName ? ` · ${item.stageName}` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 text-xs">{formatTime(item.startTime)}</span>
                    <span className={statusBadge(item.status)}>{item.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
