import type { ScheduleItem } from '../actions/public-actions';
import { getPublicSchedule } from '../actions/public-actions';

export const revalidate = 60;

interface PageProps {
  params: Promise<{ madrassaId: string }>;
}

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

export default async function PublicSchedulePage({ params }: PageProps) {
  const { madrassaId } = await params;

  const result = await getPublicSchedule(madrassaId);

  const schedule = result.success && result.data ? result.data : [];
  const error = result.success ? null : result.message ?? 'Failed to load schedule.';

  const groupedByDay = groupByDay(schedule);

  return (
    <div className="px-6 py-10 max-w-3xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-black text-white tracking-tight mb-2">Live Schedule</h1>
        <p className="text-slate-400 text-sm">Follow the itinerary across all stages</p>
      </div>

      {error && (
        <p className="text-red-300 text-sm mb-6 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-center">
          {error}
        </p>
      )}

      {!error && schedule.length === 0 && (
        <p className="text-slate-500 text-center text-sm">No schedule has been published yet.</p>
      )}

      <div className="flex flex-col gap-10">
        {groupedByDay.map(([day, items]) => (
          <div key={day}>
            <h2 className="text-emerald-300 text-sm font-semibold uppercase tracking-widest mb-4">
              {day}
            </h2>
            <div className="relative pl-6 border-l border-white/10 flex flex-col gap-6">
              {items.map((item) => (
                <div key={item.eventId} className="relative">
                  <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full bg-emerald-400 ring-4 ring-emerald-500/15" />
                  <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <h3 className="text-white font-semibold">{item.eventName}</h3>
                        {item.category && (
                          <p className="text-slate-500 text-xs mt-0.5">{item.category}</p>
                        )}
                      </div>
                      <span className={statusBadge(item.status)}>{item.status}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        {formatTime(item.startTime)}
                        {item.endTime ? ` - ${formatTime(item.endTime)}` : ''}
                      </span>
                      {item.stageName && (
                        <span className="flex items-center gap-1.5">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.5}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25s-7.5-4.108-7.5-11.25a7.5 7.5 0 1115 0z"
                            />
                          </svg>
                          {item.stageName}
                        </span>
                      )}
                    </div>
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
