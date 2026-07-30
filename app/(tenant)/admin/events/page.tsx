"use client";

import { useState, useTransition } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  createEvent,
  generateSubgroupsAndCodeLetters,
  createStage,
  scheduleEvent,
} from "../actions/event-actions";

// ── Types ──────────────────────────────────────────────────────────────────

interface Event {
  id: string;
  name: string;
  gender_rule: string;
  is_group_event: boolean;
  group_strength: number | null;
  points_single: string;
  points_group: string | null;
  is_general: boolean;
  category_id: string | null;
}

interface Stage {
  id: string;
  name: string;
}

interface ScheduleEntry {
  id: string;
  event_id: string;
  stage_id: string;
  start_time: string;
  status: string;
  eventName?: string;
  stageName?: string;
}

// ── Shared UI atoms ────────────────────────────────────────────────────────

function Input({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-zinc-400">{label}</label>
      <input
        {...props}
        className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-40"
      />
    </div>
  );
}

function Select({
  label,
  children,
  ...props
}: { label: string } & React.SelectHTMLAttributes<HTMLSelectElement> & {
    children: React.ReactNode;
  }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-zinc-400">{label}</label>
      <select
        {...props}
        className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        {children}
      </select>
    </div>
  );
}

function Btn({
  children,
  variant = "primary",
  ...props
}: { variant?: "primary" | "emerald" | "ghost" } & React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children: React.ReactNode;
  }) {
  const base = "rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-40";
  const styles = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-500",
    emerald: "bg-emerald-600 text-white hover:bg-emerald-500",
    ghost: "border border-zinc-700 text-zinc-300 hover:bg-zinc-800",
  };
  return (
    <button {...props} className={`${base} ${styles[variant]}`}>
      {children}
    </button>
  );
}

function ErrMsg({ msg }: { msg: string }) {
  return msg ? <p className="text-sm text-red-400">{msg}</p> : null;
}

function Badge({ text, green }: { text: string; green?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        green ? "bg-emerald-900/50 text-emerald-400" : "bg-zinc-800 text-zinc-400"
      }`}
    >
      {text}
    </span>
  );
}

// ── Modal ──────────────────────────────────────────────────────────────────

function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-lg leading-none">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Events & Squads Tab ────────────────────────────────────────────────────

function EventsSquadsTab() {
  const [events, setEvents] = useState<Event[]>([]);

  // Create event form state
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [isGeneral, setIsGeneral] = useState(false);
  const [genderRule, setGenderRule] = useState<"male" | "female" | "mixed">("mixed");
  const [isGroup, setIsGroup] = useState(false);
  const [groupStrength, setGroupStrength] = useState(3);
  const [pointsSingle, setPointsSingle] = useState("5-3-1");
  const [pointsGroup, setPointsGroup] = useState("10-6-2");
  const [createErr, setCreateErr] = useState("");
  const [isPendingCreate, startCreate] = useTransition();

  // Generate modal state
  const [modalEvent, setModalEvent] = useState<Event | null>(null);
  const [prefix, setPrefix] = useState("A");
  const [genResult, setGenResult] = useState("");
  const [genErr, setGenErr] = useState("");
  const [isPendingGen, startGen] = useTransition();

  function handleCreateEvent() {
    if (!name.trim()) { setCreateErr("Name required"); return; }
    setCreateErr("");
    startCreate(async () => {
      try {
        const ev = await createEvent({
          name: name.trim(),
          categoryId: categoryId || null,
          isGeneral,
          genderRule,
          isGroupEvent: isGroup,
          groupStrength,
          pointsSingle,
          pointsGroup,
        });
        if (ev.success && ev.data) {
          setEvents((p) => [...p, ev.data as Event]);
          setName("");
          setCategoryId("");
        } else {
          console.error(ev.message);
          alert(ev.message || "Failed to create event");
        }
      } catch (e: unknown) {
        setCreateErr(e instanceof Error ? e.message : "Error");
      }
    });
  }

  function openModal(ev: Event) {
    setModalEvent(ev);
    setGenResult("");
    setGenErr("");
    setPrefix("A");
  }

  function handleGenerate() {
    if (!modalEvent) return;
    setGenErr("");
    setGenResult("");
    startGen(async () => {
      try {
        const result = await generateSubgroupsAndCodeLetters(
          modalEvent.id,
          prefix.toUpperCase()
        );
        
        if (result?.success) {
          // Check if data exists and is an array before getting length
          const count = Array.isArray(result.data) ? result.data.length : 0;
          setGenResult(`Generated ${count} subgroup(s).`);
        } else {
          setGenErr(result?.message || "Failed to generate subgroups.");
        }
      } catch (e: unknown) {
        setGenErr(e instanceof Error ? e.message : "Error");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Create event form */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">Create Event</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Input label="Event Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Quran Recitation" />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-400">Category</label>
            <div className="flex gap-3 items-center">
              <input
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 flex-1 disabled:opacity-40"
                placeholder="Category UUID"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                disabled={isGeneral}
              />
              <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={isGeneral}
                  onChange={(e) => setIsGeneral(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-indigo-500"
                />
                <span className="text-xs text-zinc-400">General</span>
              </label>
            </div>
          </div>

          <Select
            label="Gender Rule"
            value={genderRule}
            onChange={(e) => setGenderRule(e.target.value as "male" | "female" | "mixed")}
          >
            <option value="mixed">Mixed</option>
            <option value="male">Male only</option>
            <option value="female">Female only</option>
          </Select>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-400">Event Type</label>
            <div className="flex rounded-lg overflow-hidden border border-zinc-700">
              <button
                onClick={() => setIsGroup(false)}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  !isGroup ? "bg-indigo-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                Individual
              </button>
              <button
                onClick={() => setIsGroup(true)}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  isGroup ? "bg-indigo-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                Group
              </button>
            </div>
          </div>

          {isGroup && (
            <Input
              label="Group Strength (members per squad)"
              type="number"
              min={2}
              value={groupStrength}
              onChange={(e) => setGroupStrength(Number(e.target.value))}
            />
          )}

          <Input
            label="Points (Single) e.g. 5-3-1"
            value={pointsSingle}
            onChange={(e) => setPointsSingle(e.target.value)}
            placeholder="5-3-1"
          />
          {isGroup && (
            <Input
              label="Points (Group) e.g. 10-6-2"
              value={pointsGroup}
              onChange={(e) => setPointsGroup(e.target.value)}
              placeholder="10-6-2"
            />
          )}
        </div>

        <ErrMsg msg={createErr} />
        <Btn onClick={handleCreateEvent} disabled={isPendingCreate}>
          {isPendingCreate ? "Creating…" : "Create Event"}
        </Btn>
      </div>

      {/* Events table */}
      {events.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800">
            <span className="text-sm font-medium text-zinc-300">{events.length} Events</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-800/50">
                <tr>
                  {["Name", "Gender", "Type", "Strength", "Points", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {events.map((ev) => (
                  <tr key={ev.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3 text-white font-medium">{ev.name}</td>
                    <td className="px-4 py-3 text-zinc-300 capitalize">{ev.gender_rule}</td>
                    <td className="px-4 py-3">
                      <Badge text={ev.is_group_event ? "Group" : "Individual"} green={ev.is_group_event} />
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{ev.group_strength ?? "—"}</td>
                    <td className="px-4 py-3 text-zinc-400 font-mono text-xs">
                      {ev.is_group_event ? ev.points_group : ev.points_single}
                    </td>
                    <td className="px-4 py-3">
                      <Btn variant="ghost" onClick={() => openModal(ev)}>
                        Generate Squads &amp; Codes
                      </Btn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Generate modal */}
      <Modal open={!!modalEvent} onClose={() => setModalEvent(null)} title={`Generate — ${modalEvent?.name}`}>
        <p className="text-sm text-zinc-400">
          Assigns code letters to each participant/squad. Existing subgroups for this event will be replaced.
        </p>
        <Input
          label="Prefix Letter (e.g. A → A1, A2, A3…)"
          value={prefix}
          maxLength={3}
          onChange={(e) => setPrefix(e.target.value)}
        />
        <ErrMsg msg={genErr} />
        {genResult && <p className="text-sm text-emerald-400">✓ {genResult}</p>}
        <div className="flex gap-3 pt-1">
          <Btn variant="emerald" onClick={handleGenerate} disabled={isPendingGen}>
            {isPendingGen ? "Generating…" : "Generate"}
          </Btn>
          <Btn variant="ghost" onClick={() => setModalEvent(null)}>Cancel</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ── Stage Schedule Tab ─────────────────────────────────────────────────────

function StageScheduleTab() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [stageName, setStageName] = useState("");
  const [stageErr, setStageErr] = useState("");
  const [isPendingStage, startStage] = useTransition();

  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [selEventId, setSelEventId] = useState("");
  const [selStageId, setSelStageId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [schedErr, setSchedErr] = useState("");
  const [isPendingSched, startSched] = useTransition();

  // Local events list — user can type event ID directly for now
  // In production wire this to a fetch or shared state
  const [eventIdInput, setEventIdInput] = useState("");
  const [eventNameInput, setEventNameInput] = useState("");

  function handleAddStage() {
    if (!stageName.trim()) { setStageErr("Name required"); return; }
    setStageErr("");
    startStage(async () => {
      try {
        const s = await createStage(stageName.trim());
        if (s?.success && s?.data) {
          setStages((p) => [...p, s.data as Stage]);
          setStageName("");
          if (!selStageId) setSelStageId((s.data as Stage).id);
        } else {
          console.error(s?.message);
          alert(s?.message || "Failed to create stage");
        }
      } catch (e: unknown) {
        setStageErr(e instanceof Error ? e.message : "Error");
      }
    });
  }

  function handleSchedule() {
    const eid = selEventId || eventIdInput;
    if (!eid || !selStageId || !startTime) { setSchedErr("All fields required"); return; }
    setSchedErr("");
    startSched(async () => {
      try {
        const entry = await scheduleEvent(eid, selStageId, startTime);
        
        if (entry?.success && entry?.data) {
          const selectedStageName = stages.find(s => s.id === selStageId)?.name ?? selStageId;

          setSchedules((p) => [
            ...p.filter((x) => x.event_id !== eid),
            {
              ...(entry.data as ScheduleEntry),
              eventName: eventNameInput || eid,
              stageName: selectedStageName,
            },
          ]);
        } else {
          console.error(entry?.message);
          alert(entry?.message || "Failed to schedule event.");
        }
        setSelEventId("");
        setEventIdInput("");
        setEventNameInput("");
        setStartTime("");
      } catch (e: unknown) {
        setSchedErr(e instanceof Error ? e.message : "Error");
      }
    });
  }

  // Group schedules by stage
  const byStage: Record<string, ScheduleEntry[]> = {};
  for (const s of schedules) {
    const key = s.stageName ?? s.stage_id;
    if (!byStage[key]) byStage[key] = [];
    byStage[key].push(s);
  }
  for (const key of Object.keys(byStage)) {
    byStage[key].sort((a, b) => a.start_time.localeCompare(b.start_time));
  }

  return (
    <div className="space-y-6">
      {/* Add stage */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">Add Stage</h2>
        <div className="flex gap-3 flex-col sm:flex-row">
          <input
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g. Main Stage"
            value={stageName}
            onChange={(e) => setStageName(e.target.value)}
          />
          <Btn onClick={handleAddStage} disabled={isPendingStage}>
            {isPendingStage ? "Adding…" : "Add Stage"}
          </Btn>
        </div>
        <ErrMsg msg={stageErr} />
        {stages.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {stages.map((s) => (
              <span key={s.id} className="rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs text-zinc-300">
                {s.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Assign event to stage */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">Assign Event to Stage</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Event ID"
            value={eventIdInput}
            onChange={(e) => setEventIdInput(e.target.value)}
            placeholder="UUID from Events tab"
          />
          <Input
            label="Event Display Name (optional)"
            value={eventNameInput}
            onChange={(e) => setEventNameInput(e.target.value)}
            placeholder="e.g. Quran Recitation"
          />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-400">Stage</label>
            <select
              value={selStageId}
              onChange={(e) => setSelStageId(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select stage…</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <Input
            label="Start Time"
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>
        <ErrMsg msg={schedErr} />
        <Btn variant="emerald" onClick={handleSchedule} disabled={isPendingSched}>
          {isPendingSched ? "Scheduling…" : "Schedule Event"}
        </Btn>
      </div>

      {/* Schedule board */}
      {schedules.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-white">Schedule Board</h2>
          {Object.entries(byStage).map(([stageName, entries]) => (
            <div key={stageName} className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-800/40 flex items-center gap-2">
                <span className="text-sm font-semibold text-indigo-400">{stageName}</span>
                <span className="text-xs text-zinc-500">{entries.length} event(s)</span>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-zinc-800/20">
                  <tr>
                    {["Time", "Event", "Status"].map((h) => (
                      <th key={h} className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {entries.map((entry) => (
                    <tr key={entry.id ?? entry.event_id} className="hover:bg-zinc-800/20 transition-colors">
                      <td className="px-4 py-3 text-zinc-300 font-mono text-xs whitespace-nowrap">
                        {new Date(entry.start_time).toLocaleString([], {
                          month: "short", day: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3 text-white">{entry.eventName ?? entry.event_id}</td>
                      <td className="px-4 py-3">
                        <Badge text={entry.status} green={entry.status === "upcoming"} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function EventsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Event Management</h1>
          <p className="text-sm text-zinc-400 mt-1">Create events, generate squads, assign code letters, and build the stage schedule.</p>
        </div>

        <Tabs defaultValue="events" className="w-full">
          <TabsList className="bg-zinc-900 border border-zinc-800 h-10">
            <TabsTrigger
              value="events"
              className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-zinc-400"
            >
              Events &amp; Squads
            </TabsTrigger>
            <TabsTrigger
              value="schedule"
              className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-zinc-400"
            >
              Stage Schedule
            </TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="mt-6">
            <EventsSquadsTab />
          </TabsContent>
          <TabsContent value="schedule" className="mt-6">
            <StageScheduleTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
