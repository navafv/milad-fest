'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getAssignedEvents,
  getEventParticipantsByCodeLetter,
  submitJudgeScore,
  logoutJudge,
  getCurrentJudgeSession,
  type AssignedEvent,
  type JudgeParticipant,
} from '../actions/judge-actions';

type ViewState = 'loading' | 'events' | 'scoring' | 'complete';

export default function JudgeDashboardPage() {
  const router = useRouter();

  const [view, setView] = useState<ViewState>('loading');
  const [judgeId, setJudgeId] = useState<string | null>(null);
  const [events, setEvents] = useState<AssignedEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<AssignedEvent | null>(null);
  const [participants, setParticipants] = useState<JudgeParticipant[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    (async () => {
      const session = await getCurrentJudgeSession();
      if (!session) {
        router.push('/judge/login');
        return;
      }
      setJudgeId(session.judgeId);

      const result = await getAssignedEvents();
      if (result.success && result.data) {
        setEvents(result.data);
      } else {
        setError(result.message ?? 'Failed to load events.');
      }
      setView('events');
    })();
  }, [router]);

  const currentParticipant = participants[currentIndex] ?? null;

  const rubrics = useMemo(
    () =>
      selectedEvent?.rubrics ?? [
        { key: 'rhythm', label: 'Rhythm', maxScore: 10 },
        { key: 'content', label: 'Content', maxScore: 10 },
        { key: 'expression', label: 'Expression', maxScore: 10 },
      ],
    [selectedEvent]
  );

  const totalScore = useMemo(
    () => rubrics.reduce((sum, r) => sum + (scores[r.key] ?? 0), 0),
    [scores, rubrics]
  );

  async function handleSelectEvent(event: AssignedEvent) {
    setError(null);
    setSelectedEvent(event);
    setView('loading');

    const result = await getEventParticipantsByCodeLetter(event.id);
    if (result.success && result.data) {
      setParticipants(result.data);
      setCurrentIndex(0);
      const first = result.data[0];
      setScores(
        first?.existingScoreData ??
          Object.fromEntries((event.rubrics ?? []).map((r) => [r.key, 0]))
      );
      setView(result.data.length > 0 ? 'scoring' : 'events');
      if (result.data.length === 0) {
        setError('No participants found for this event yet.');
      }
    } else {
      setError(result.message ?? 'Failed to load participants.');
      setView('events');
    }
  }

  function loadScoresForIndex(index: number) {
    const participant = participants[index];
    if (!participant) return;
    if (participant.existingScoreData) {
      setScores(participant.existingScoreData);
    } else {
      setScores(Object.fromEntries(rubrics.map((r) => [r.key, 0])));
    }
  }

  async function saveCurrentScore(): Promise<boolean> {
    if (!currentParticipant || !judgeId || !selectedEvent) return false;

    setIsSaving(true);
    setError(null);

    try {
      const result = await submitJudgeScore(
        selectedEvent.id,
        currentParticipant.participantType,
        currentParticipant.participantId,
        scores,
        totalScore
      );

      if (!result.success) {
        setError(result.message ?? 'Failed to save score.');
        setIsSaving(false);
        return false;
      }

      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1600);
      return true;
    } catch (e) {
      console.error(e);
      setError('An unexpected error occurred.');
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleNext() {
    const saved = await saveCurrentScore();
    if (!saved) return;

    if (currentIndex < participants.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      loadScoresForIndex(nextIndex);
    }
  }

  function handlePrevious() {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      loadScoresForIndex(prevIndex);
    }
  }

  async function handleSubmitAll() {
    const saved = await saveCurrentScore();
    if (!saved) return;
    setView('complete');
  }

  function handleRubricChange(key: string, value: string, max: number) {
    const num = value === '' ? 0 : Math.max(0, Math.min(max, Number(value)));
    setScores((prev) => ({ ...prev, [key]: num }));
  }

  function handleRubricStep(key: string, delta: number, max: number) {
    setScores((prev) => {
      const current = prev[key] ?? 0;
      const next = Math.max(0, Math.min(max, current + delta));
      return { ...prev, [key]: next };
    });
  }

  async function handleLogout() {
    await logoutJudge();
    router.push('/judge/login');
  }

  function backToEvents() {
    setView('events');
    setSelectedEvent(null);
    setParticipants([]);
    setCurrentIndex(0);
    setScores({});
  }

  if (view === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-4 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (view === 'events') {
    return (
      <div className="min-h-screen bg-slate-950 pb-10">
        <header className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur-lg border-b border-white/5 px-5 py-4 flex items-center justify-between">
          <h1 className="text-lg font-bold text-white">Your Events</h1>
          <button
            onClick={handleLogout}
            className="text-xs text-slate-400 border border-white/10 rounded-lg px-3 py-2 min-h-[44px] flex items-center active:scale-95 transition"
          >
            Logout
          </button>
        </header>

        <div className="px-5 pt-5">
          {error && (
            <p role="alert" aria-live="assertive" className="text-red-300 text-sm mb-4 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {events.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center text-center py-16 px-6 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] mt-6">
              <div className="h-11 w-11 rounded-full bg-white/5 flex items-center justify-center mb-3 text-slate-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-300">No events assigned yet</p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                Once an admin assigns you to an event, it will show up here for scoring.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {events.map((event) => (
              <button
                key={event.id}
                onClick={() => handleSelectEvent(event)}
                className="w-full text-left bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl px-4 py-4 min-h-[44px] transition active:scale-[0.98]"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-white font-semibold text-base">{event.name}</h2>
                    {event.category && (
                      <p className="text-emerald-300/70 text-xs mt-0.5">{event.category}</p>
                    )}
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
                    {event.status}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (view === 'complete') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-6 text-center">
        <div className="h-16 w-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-5">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 text-emerald-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-white mb-1">Marks Submitted</h1>
        <p className="text-slate-400 text-sm mb-8">
          Your scores for {selectedEvent?.name} have been recorded.
        </p>
        <button
          onClick={backToEvents}
          className="rounded-xl bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-semibold px-6 py-3 min-h-[44px] transition active:scale-[0.98]"
        >
          Back to Events
        </button>
      </div>
    );
  }

  // Scoring view
  return (
    <div className="min-h-screen bg-slate-950 pb-32">
      <header className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur-lg border-b border-white/5 px-5 py-4 flex items-center justify-between relative">
        <button onClick={backToEvents} className="text-slate-400 text-sm flex items-center gap-1 min-h-[44px]">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Events
        </button>
        <h1 className="text-sm font-semibold text-white truncate max-w-[50%]">{selectedEvent?.name}</h1>
        <span className="text-xs text-slate-500">
          {currentIndex + 1}/{participants.length}
        </span>

        {savedFlash && (
          <span
            role="status"
            aria-live="polite"
            className="absolute left-1/2 -translate-x-1/2 -bottom-8 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 shadow-lg"
          >
            Score saved
          </span>
        )}
      </header>

      <div className="px-5 pt-6">
        {error && (
          <p role="alert" aria-live="assertive" className="text-red-300 text-sm mb-4 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div
          className="flex gap-2.5 mb-6 overflow-x-auto pb-2 -mx-5 px-5"
          style={{
            maskImage:
              'linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)',
            WebkitMaskImage:
              'linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)',
          }}
        >
          {participants.map((p, idx) => (
            <button
              key={p.participantId}
              onClick={async () => {
                if (isSaving) return;

                const saved = await saveCurrentScore();
                if (!saved) return;
                setCurrentIndex(idx);
                loadScoresForIndex(idx);
              }}
              disabled={isSaving}
              aria-label={`Score participant ${p.codeLetter}${p.alreadyScored ? ', already scored' : ''}`}
              aria-current={idx === currentIndex ? 'true' : undefined}
              className={`shrink-0 h-11 w-11 rounded-full text-sm font-bold flex items-center justify-center transition border disabled:opacity-40 disabled:cursor-not-allowed ${
                idx === currentIndex
                  ? 'bg-emerald-500 text-emerald-950 border-emerald-400 scale-110'
                  : p.alreadyScored
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20'
                  : 'bg-white/5 text-slate-400 border-white/10'
              }`}
            >
              {p.codeLetter}
            </button>
          ))}
        </div>

        {currentParticipant && (
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl">
            <div className="flex flex-col items-center mb-6">
              <span className="text-xs uppercase tracking-widest text-emerald-300/70 mb-1">
                Code Letter
              </span>
              <span className="text-5xl font-black text-white tracking-wider">
                {currentParticipant.codeLetter}
              </span>
              <span className="text-xs text-slate-500 mt-1 capitalize">
                {currentParticipant.participantType}
              </span>
            </div>

            <div className="flex flex-col gap-4">
              {rubrics.map((rubric) => (
                <div key={rubric.key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor={`rubric-${rubric.key}`} className="text-sm text-slate-300">
                      {rubric.label}
                    </label>
                    <span className="text-xs text-slate-500">Max {rubric.maxScore}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label={`Decrease ${rubric.label}`}
                      onClick={() => handleRubricStep(rubric.key, -1, rubric.maxScore)}
                      className="h-11 w-11 shrink-0 rounded-xl bg-white/10 border border-white/10 text-white text-xl font-bold flex items-center justify-center active:scale-95 transition"
                    >
                      &minus;
                    </button>
                    <input
                      id={`rubric-${rubric.key}`}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={rubric.maxScore}
                      value={scores[rubric.key] ?? 0}
                      onChange={(e) => handleRubricChange(rubric.key, e.target.value, rubric.maxScore)}
                      className="w-full rounded-xl bg-white/10 border border-white/10 text-white text-lg font-semibold text-center px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition"
                    />
                    <button
                      type="button"
                      aria-label={`Increase ${rubric.label}`}
                      onClick={() => handleRubricStep(rubric.key, 1, rubric.maxScore)}
                      className="h-11 w-11 shrink-0 rounded-xl bg-white/10 border border-white/10 text-white text-xl font-bold flex items-center justify-center active:scale-95 transition"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-between">
              <span className="text-sm text-slate-400">Total Score</span>
              <span className="text-2xl font-black text-emerald-400">{totalScore}</span>
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 inset-x-0 bg-slate-950/95 backdrop-blur-lg border-t border-white/10 px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="flex gap-3 max-w-md mx-auto">
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0 || isSaving}
            className="flex-1 rounded-xl bg-white/5 border border-white/10 text-slate-300 font-medium py-3.5 min-h-[44px] disabled:opacity-30 transition active:scale-[0.98]"
          >
            Previous
          </button>

          {currentIndex < participants.length - 1 ? (
            <button
              onClick={handleNext}
              disabled={isSaving}
              className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/50 text-emerald-950 font-semibold py-3.5 min-h-[44px] transition active:scale-[0.98]"
            >
              {isSaving ? 'Saving...' : 'Next Participant'}
            </button>
          ) : (
            <button
              onClick={handleSubmitAll}
              disabled={isSaving}
              className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/50 text-emerald-950 font-semibold py-3.5 min-h-[44px] transition active:scale-[0.98]"
            >
              {isSaving ? 'Saving...' : 'Submit All Marks'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
