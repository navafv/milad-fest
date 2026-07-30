'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  getEventScoreboard,
  overrideRanksAndTieBreakers,
  publishEventResults,
  getEventsForAudit,
  type ScoreboardEntry,
  type EventOption,
  type RankOverrideInput,
} from '../actions/result-actions';
import { verifySession } from '../actions/auth-actions';
import { Toast, type ToastState } from '@/components/ui/toast';

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      <div className="h-11 w-11 rounded-full bg-white/5 flex items-center justify-center mb-3 text-slate-500">
        {icon}
      </div>
      <p className="text-sm font-medium text-slate-300">{title}</p>
      <p className="text-xs text-slate-500 mt-1 max-w-xs">{description}</p>
    </div>
  );
}

export default function AdminResultsPage() {
  // ─── Tenant resolution ────────────────────────────────────────────────
  // This app resolves the tenant via a cookie/header (x-madrassa-subdomain)
  // rather than a dynamic route segment, so there is no `params.madrassaId`
  // to read here. `verifySession()` is a server action that reads the
  // httpOnly `madrassa_session` cookie server-side and returns the
  // authenticated admin's madrassa_id — this is the only trustworthy
  // source for it on this page.
  const [madrassaId, setMadrassaId] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [scoreboard, setScoreboard] = useState<ScoreboardEntry[]>([]);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadingScoreboard, setLoadingScoreboard] = useState(false);
  const [savingOverrides, setSavingOverrides] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);

  // Resolve the authenticated admin's tenant on mount.
  useEffect(() => {
    (async () => {
      const session = await verifySession();
      if (!session) {
        window.location.href = '/admin/login';
        return;
      }
      setMadrassaId(session.madrassa_id);
    })();
  }, []);

  // Load events for audit once we know which tenant we're operating on.
  useEffect(() => {
    if (!madrassaId) return;

    (async () => {
      setLoading(true);
      const result = await getEventsForAudit(madrassaId);
      if (result.success && result.data) {
        setEvents(result.data);
        if (result.data.length > 0) {
          setSelectedEventId(result.data[0].id);
        }
      } else {
        setSessionError(result.message ?? 'Failed to load events.');
        setToast({ variant: 'error', message: result.message ?? 'Failed to load events.' });
      }
      setLoading(false);
    })();
  }, [madrassaId]);

  useEffect(() => {
    if (!madrassaId || !selectedEventId) return;
    loadScoreboard(selectedEventId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEventId, madrassaId]);

  async function loadScoreboard(eventId: string) {
    if (!madrassaId) return;

    setLoadingScoreboard(true);
    setScoreboard([]); // prevents a stale-event flash while the new one loads
    setToast(null);

    const result = await getEventScoreboard(madrassaId, eventId);
    if (result.success && result.data) {
      setScoreboard(result.data);
      const initialOverrides: Record<string, string> = {};
      for (const entry of result.data) {
        const key = `${entry.participantType}:${entry.participantId}`;
        initialOverrides[key] = entry.overrideRank !== null ? String(entry.overrideRank) : '';
      }
      setOverrides(initialOverrides);
    } else {
      setToast({ variant: 'error', message: result.message ?? 'Failed to load scoreboard.' });
      setScoreboard([]);
    }
    setLoadingScoreboard(false);
  }

  const hasTies = useMemo(() => scoreboard.some((e) => e.isTied), [scoreboard]);

  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedEventId) ?? null,
    [events, selectedEventId]
  );

  function handleOverrideChange(entry: ScoreboardEntry, value: string) {
    const key = `${entry.participantType}:${entry.participantId}`;
    if (value === '' || /^\d+$/.test(value)) {
      setOverrides((prev) => ({ ...prev, [key]: value }));
    }
  }

  async function handleSaveOverrides() {
    if (!madrassaId) return;

    setSavingOverrides(true);
    setToast(null);

    const rankOverrides: RankOverrideInput[] = [];
    for (const entry of scoreboard) {
      const key = `${entry.participantType}:${entry.participantId}`;
      const value = overrides[key];
      if (value !== undefined && value !== '') {
        rankOverrides.push({
          participantId: entry.participantId,
          participantType: entry.participantType,
          rank: Number(value),
        });
      }
    }

    if (rankOverrides.length === 0) {
      setSavingOverrides(false);
      setToast({ variant: 'error', message: 'No rank overrides to save. Enter at least one manual rank.' });
      return;
    }

    const result = await overrideRanksAndTieBreakers(madrassaId, selectedEventId, rankOverrides);
    setSavingOverrides(false);

    if (result.success) {
      setToast({ variant: 'success', message: 'Rank overrides saved successfully.' });
      loadScoreboard(selectedEventId);
    } else {
      setToast({ variant: 'error', message: result.message ?? 'Failed to save rank overrides.' });
    }
  }

  async function handlePublish() {
    if (!madrassaId) return;

    setPublishing(true);
    setToast(null);
    setShowPublishConfirm(false);

    const result = await publishEventResults(madrassaId, selectedEventId);
    setPublishing(false);

    if (result.success) {
      setToast({
        variant: 'success',
        message: `Results published successfully. ${result.data?.publishedCount ?? 0} participant records updated.`,
      });
      loadScoreboard(selectedEventId);
    } else {
      setToast({ variant: 'error', message: result.message ?? 'Failed to publish results.' });
    }
  }

  function finalRankFor(entry: ScoreboardEntry): number {
    const key = `${entry.participantType}:${entry.participantId}`;
    const overrideValue = overrides[key];
    if (overrideValue && overrideValue !== '') {
      return Number(overrideValue);
    }
    return entry.autoRank;
  }

  if (loading || !madrassaId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-4 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-16">
      <header className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur-lg border-b border-white/5 px-6 py-5">
        <h1 className="text-xl font-bold text-white">Result Audit &amp; Publishing</h1>
        <p className="text-slate-500 text-sm mt-0.5">Review scores, override ranks, and publish results.</p>
      </header>

      <div className="px-6 pt-6 max-w-5xl mx-auto">
        {sessionError && (
          <div className="mb-6 flex items-start gap-3 bg-rose-500/10 border border-rose-500/25 rounded-xl px-4 py-3">
            <p className="text-rose-300 text-sm">{sessionError}</p>
          </div>
        )}

        <div className="mb-6">
          <label htmlFor="event" className="block text-xs font-medium text-slate-400 mb-1.5">
            Select Event
          </label>
          <select
            id="event"
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="w-full sm:w-96 rounded-xl bg-white/5 border border-white/10 text-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition"
          >
            {events.length === 0 && <option value="">No events available</option>}
            {events.map((event) => (
              <option key={event.id} value={event.id} className="bg-slate-900">
                {event.name} {event.category ? `(${event.category})` : ''} &mdash; {event.status}
              </option>
            ))}
          </select>
        </div>

        {hasTies && (
          <div className="mb-4 flex items-start gap-3 bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-amber-400 shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
            <div>
              <p className="text-amber-300 font-semibold text-sm">Tied Scores Detected</p>
              <p className="text-amber-200/70 text-xs mt-0.5">
                Two or more participants share the exact same average score. Use manual rank overrides to
                break the tie before publishing.
              </p>
            </div>
          </div>
        )}

        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          {loadingScoreboard ? (
            <div className="flex flex-col items-center justify-center text-center py-12 px-6">
              <div className="h-8 w-8 border-4 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin mb-3" />
              <p className="text-slate-500 text-sm">Loading scoreboard...</p>
            </div>
          ) : scoreboard.length === 0 ? (
            <EmptyState
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.129v-1.007m-6 0h6m-6 0H5.625c-.621 0-1.125-.504-1.125-1.125V4.875c0-.621.504-1.125 1.125-1.125h12.75c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125H9z"
                  />
                </svg>
              }
              title="No scores yet"
              description="Once judges submit scores for this event, they'll show up here for audit and rank overrides."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="text-left px-4 py-3 font-medium text-slate-400">Code Letter</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-400">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-400">Judges</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-400">Avg Score</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-400">Auto Rank</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-400">Manual Override</th>
                  </tr>
                </thead>
                <tbody>
                  {scoreboard.map((entry) => {
                    const key = `${entry.participantType}:${entry.participantId}`;
                    return (
                      <tr
                        key={key}
                        className={`border-b border-white/5 last:border-0 ${
                          entry.isTied ? 'bg-amber-500/5' : ''
                        }`}
                      >
                        <td className="px-4 py-3 font-bold text-white">{entry.codeLetter}</td>
                        <td className="px-4 py-3 text-slate-400 capitalize">{entry.participantType}</td>
                        <td className="px-4 py-3 text-slate-400">{entry.judgeCount}</td>
                        <td className="px-4 py-3 font-semibold text-emerald-400">{entry.averageScore}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              entry.isTied
                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/25'
                                : 'bg-white/5 text-slate-300 border border-white/10'
                            }`}
                          >
                            #{entry.autoRank}
                            {entry.isTied && (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-3 w-3"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M12 9v3.75m0 3.75h.008v.008H12v-.008zM21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={overrides[key] ?? ''}
                            onChange={(e) => handleOverrideChange(entry, e.target.value)}
                            placeholder={String(entry.autoRank)}
                            className="w-20 rounded-lg bg-white/10 border border-white/10 text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <button
            onClick={handleSaveOverrides}
            disabled={savingOverrides || scoreboard.length === 0}
            className="flex-1 sm:flex-none sm:px-6 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-medium py-3.5 disabled:opacity-40 transition active:scale-[0.98]"
          >
            {savingOverrides ? 'Saving...' : 'Save Rank Overrides'}
          </button>

          <button
            onClick={() => setShowPublishConfirm(true)}
            disabled={publishing || scoreboard.length === 0}
            className="flex-1 sm:flex-none sm:px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/50 text-emerald-950 font-semibold py-3.5 transition active:scale-[0.98]"
          >
            {publishing ? 'Publishing...' : 'Publish Results to Public Portal'}
          </button>
        </div>
      </div>

      {showPublishConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6">
          <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-2">Publish Results?</h2>
            <p className="text-slate-400 text-sm mb-1">
              This will publish results for <span className="text-white font-medium">{selectedEvent?.name}</span> to
              the public portal.
            </p>
            <p className="text-slate-500 text-xs mb-6">
              Team points will be calculated and assigned based on final ranks. This action can be re-run
              if ranks change later.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowPublishConfirm(false)}
                className="flex-1 rounded-xl bg-white/5 border border-white/10 text-slate-300 font-medium py-3 transition active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                onClick={handlePublish}
                className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-semibold py-3 transition active:scale-[0.98]"
              >
                Confirm Publish
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
