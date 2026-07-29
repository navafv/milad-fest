"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import {
  createMadrassa,
  toggleMadrassaStatus,
  getAllMadrassas,
  type MadrassaRow,
  type ActionResult,
} from "../actions/madrassa-actions";

// ─── Pill badge ──────────────────────────────────────────────────────────────
function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        active
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
          : "bg-slate-100 text-slate-500 ring-1 ring-slate-200"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-slate-400"}`}
      />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

// ─── Toggle button ────────────────────────────────────────────────────────────
function ToggleButton({
  id,
  isActive,
  onToggle,
}: {
  id: string;
  isActive: boolean;
  onToggle: (id: string, current: boolean) => void;
}) {
  return (
    <button
      onClick={() => onToggle(id, isActive)}
      className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
        isActive
          ? "bg-rose-50 text-rose-600 hover:bg-rose-100 focus:ring-rose-400 ring-1 ring-rose-200"
          : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 focus:ring-emerald-400 ring-1 ring-emerald-200"
      }`}
    >
      {isActive ? "Deactivate" : "Activate"}
    </button>
  );
}

// ─── Form field ───────────────────────────────────────────────────────────────
function Field({
  label,
  name,
  type = "text",
  placeholder,
  hint,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-xs font-semibold uppercase tracking-widest text-slate-500">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        required
        autoComplete="off"
        className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
      />
      {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

// ─── Toast notification ───────────────────────────────────────────────────────
function Toast({
  result,
  onDismiss,
}: {
  result: ActionResult | null;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!result) return;
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [result, onDismiss]);

  if (!result) return null;

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl px-5 py-3.5 text-sm font-medium shadow-xl ring-1 transition-all ${
        result.success
          ? "bg-emerald-600 text-white ring-emerald-700"
          : "bg-rose-600 text-white ring-rose-700"
      }`}
    >
      <span>{result.success ? "✓" : "✕"}</span>
      <span>{result.success ? result.message : result.error}</span>
      <button onClick={onDismiss} className="ml-2 opacity-70 hover:opacity-100">
        ✕
      </button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function SuperAdminDashboard() {
  const [madrassas, setMadrassas] = useState<MadrassaRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toast, setToast] = useState<ActionResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [formKey, setFormKey] = useState(0); // reset form after submit

  const loadMadrassas = useCallback(async () => {
    const { data, error } = await getAllMadrassas();
    if (error) setLoadError(error);
    else setMadrassas(data ?? []);
  }, []);

  useEffect(() => {
    loadMadrassas();
  }, [loadMadrassas]);

  function handleCreate(formData: FormData) {
    startTransition(async () => {
      const result = await createMadrassa(formData);
      setToast(result);
      if (result.success) {
        setFormKey((k) => k + 1);
        await loadMadrassas();
      }
    });
  }

  function handleToggle(id: string, current: boolean) {
    startTransition(async () => {
      const result = await toggleMadrassaStatus(id, current);
      setToast(result);
      if (result.success) await loadMadrassas();
    });
  }

  function fmt(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Top bar */}
      <header className="border-b border-slate-200 bg-white px-8 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">
              Super Admin Portal
            </p>
            <h1 className="text-xl font-bold text-slate-800">Milad Fest</h1>
          </div>
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600 ring-1 ring-indigo-200">
            Platform Administrator
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-8 py-10">
        {/* ── Create Madrassa ─────────────────────────────────── */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="text-base font-bold text-slate-800">Register New Madrassa</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Each Madrassa gets its own subdomain and login credentials.
            </p>
          </div>

          <form key={formKey} action={handleCreate} className="grid gap-5 p-6 sm:grid-cols-2">
            <Field
              label="Madrassa Name"
              name="name"
              placeholder="Dar al-Hikmah Institute"
            />
            <Field
              label="Register Number (Username)"
              name="register_number"
              placeholder="MAD-2024-001"
            />
            <Field
              label="Password"
              name="password"
              type="password"
              placeholder="Minimum 8 characters"
            />
            <Field
              label="Subdomain Slug"
              name="subdomain"
              placeholder="dar-al-hikmah"
              hint="Lowercase, letters, numbers, hyphens only — e.g. dar-al-hikmah"
            />

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 disabled:opacity-60"
              >
                {isPending ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      />
                    </svg>
                    Creating…
                  </>
                ) : (
                  "Create Madrassa"
                )}
              </button>
            </div>
          </form>
        </section>

        {/* ── Madrassa Table ──────────────────────────────────── */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
            <div>
              <h2 className="text-base font-bold text-slate-800">Registered Madrassas</h2>
              <p className="mt-0.5 text-sm text-slate-500">
                {madrassas.length} tenant{madrassas.length !== 1 ? "s" : ""} registered
              </p>
            </div>
            <button
              onClick={loadMadrassas}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
            >
              Refresh
            </button>
          </div>

          {loadError ? (
            <div className="p-6 text-sm text-rose-600">
              Failed to load madrassas: {loadError}
            </div>
          ) : madrassas.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <span className="text-3xl">🏫</span>
              <p className="text-sm font-medium text-slate-600">No madrassas yet</p>
              <p className="text-xs text-slate-400">Use the form above to register the first one.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-widest text-slate-500">
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3">Register No.</th>
                    <th className="px-6 py-3">Subdomain</th>
                    <th className="px-6 py-3">Created</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {madrassas.map((m) => (
                    <tr
                      key={m.id}
                      className={`transition-colors hover:bg-slate-50/60 ${
                        !m.is_active ? "opacity-60" : ""
                      }`}
                    >
                      <td className="px-6 py-4 font-medium text-slate-800">{m.name}</td>
                      <td className="px-6 py-4 font-mono text-slate-600">{m.register_number}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600">
                          {m.subdomain}
                          <span className="text-slate-400">.miladnabi.vercel.app</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">{fmt(m.created_at)}</td>
                      <td className="px-6 py-4">
                        <StatusBadge active={m.is_active} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <ToggleButton
                          id={m.id}
                          isActive={m.is_active}
                          onToggle={handleToggle}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      <Toast result={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
