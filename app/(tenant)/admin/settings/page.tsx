"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { verifySession } from "../actions/auth-actions";
import {
  updateFestSettings,
  changeMadrassaPassword,
  getMadrassaSettings,
} from "../actions/settings-actions";
import { logoutTenantAdmin } from "../actions/auth-actions";
import { Toast, type ToastState } from "@/components/ui/toast";

// ─── Section card ─────────────────────────────────────────────────────────────
function Card({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5">
      <div className="border-b border-white/5 px-6 py-5">
        <h2 className="text-base font-bold text-white">{title}</h2>
        <p className="mt-0.5 text-sm text-slate-500">{description}</p>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────
function Field({
  label, id, type = "text", value, onChange, placeholder, hint, readOnly,
}: {
  label: string; id: string; type?: string; value: string; onChange?: (v: string) => void;
  placeholder?: string; hint?: string; readOnly?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
        {label}
      </label>
      <input
        id={id} type={type} value={value} readOnly={readOnly}
        onChange={e => onChange?.(e.target.value)}
        placeholder={placeholder}
        className={`rounded-lg border px-3.5 py-2.5 text-sm transition focus:outline-none focus:ring-2 ${
          readOnly
            ? "border-white/10 bg-white/[0.02] text-slate-500 cursor-default"
            : "border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus:border-transparent focus:ring-emerald-400"
        }`}
      />
      {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

// ─── Submit button ────────────────────────────────────────────────────────────
function SubmitButton({ label, pending, pendingLabel }: { label: string; pending: boolean; pendingLabel?: string }) {
  return (
    <button
      type="submit" disabled={pending}
      className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:opacity-60"
    >
      {pending ? (
        <>
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          {pendingLabel ?? "Saving…"}
        </>
      ) : label}
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [madrassaId, setMadrassaId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Fest settings state
  const [festName, setFestName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [registerNumber, setRegisterNumber] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [festPending, startFestTransition] = useTransition();

  // Password state
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordPending, startPasswordTransition] = useTransition();
  const [logoutPending, startLogoutTransition] = useTransition();

  const load = useCallback(async () => {
    // verifySession is called client-side via a thin wrapper; in production
    // you'd protect this page in middleware. Here we fetch session then settings.
    const session = await verifySession();
    if (!session) { window.location.href = "/admin/login"; return; }
    setMadrassaId(session.madrassa_id);

    const { data, error } = await getMadrassaSettings(session.madrassa_id);
    if (error || !data) return;
    setFestName(data.name);
    setLogoUrl(data.logo_url ?? "");
    setRegisterNumber(data.register_number);
    setSubdomain(data.subdomain);
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleFestSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!madrassaId) return;
    startFestTransition(async () => {
      const result = await updateFestSettings(madrassaId, festName, logoUrl);
      setToast(
        result.success
          ? { variant: "success", message: result.message }
          : { variant: "error", message: result.error }
      );
    });
  }

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!madrassaId) return;
    if (newPassword !== confirmPassword) {
      setToast({ variant: "error", message: "New passwords do not match." });
      return;
    }
    startPasswordTransition(async () => {
      const result = await changeMadrassaPassword(madrassaId, oldPassword, newPassword);
      setToast(
        result.success
          ? { variant: "success", message: result.message }
          : { variant: "error", message: result.error }
      );
      if (result.success) { setOldPassword(""); setNewPassword(""); setConfirmPassword(""); }
    });
  }

  function handleLogout() {
    startLogoutTransition(async () => { await logoutTenantAdmin(); });
  }

  return (
    <div className="min-h-screen bg-slate-950 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-white/5 bg-slate-950/90 backdrop-blur-lg px-8 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
              {subdomain ? `${subdomain}.miladnabi.vercel.app` : "Milad Fest"}
            </p>
            <h1 className="text-xl font-bold text-white">{festName || "Admin Settings"}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/25 sm:inline">
              {registerNumber}
            </span>
            <button
              onClick={handleLogout}
              disabled={logoutPending}
              className="rounded-lg border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10 disabled:opacity-60"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Nav tabs */}
      <div className="border-b border-white/5 bg-slate-950 px-8">
        <div className="mx-auto max-w-3xl">
          <nav className="-mb-px flex gap-6">
            <span className="border-b-2 border-emerald-400 py-3 text-sm font-semibold text-emerald-400">
              Settings
            </span>
          </nav>
        </div>
      </div>

      <main className="mx-auto max-w-3xl space-y-6 px-8 py-10">
        {/* ── Fest Settings ──────────────────────────────────── */}
        <Card
          title="Fest Settings"
          description="Customise the name and logo displayed on your Madrassa's public Milad Fest page."
        >
          <form onSubmit={handleFestSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field
                  label="Fest Name"
                  id="festName"
                  value={festName}
                  onChange={setFestName}
                  placeholder="Thahvare Milad 2026"
                  hint="This name appears publicly on your Fest page."
                />
              </div>
              <div className="sm:col-span-2">
                <Field
                  label="Logo URL"
                  id="logoUrl"
                  value={logoUrl}
                  onChange={setLogoUrl}
                  placeholder="https://example.com/logo.png"
                  hint="Paste a direct link to your logo image (PNG or SVG recommended)."
                />
              </div>
              <Field label="Register Number" id="registerNumber" value={registerNumber} readOnly />
              <Field label="Subdomain" id="subdomain" value={`${subdomain}.miladnabi.vercel.app`} readOnly />
            </div>

            {logoUrl && /^https?:\/\/.+/.test(logoUrl) && (
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoUrl} alt="Logo preview"
                  className="h-12 w-12 rounded-lg object-contain border border-white/10 bg-white/5"
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <p className="text-xs text-slate-500">Logo preview</p>
              </div>
            )}

            <SubmitButton label="Save Fest Settings" pending={festPending} />
          </form>
        </Card>

        {/* ── Change Password ────────────────────────────────── */}
        <Card
          title="Change Password"
          description="Update your admin login password. You'll need your current password to confirm the change."
        >
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <Field
              label="Current Password" id="oldPassword" type="password"
              value={oldPassword} onChange={setOldPassword} placeholder="••••••••"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="New Password" id="newPassword" type="password"
                value={newPassword} onChange={setNewPassword}
                placeholder="Min. 8 characters"
              />
              <Field
                label="Confirm New Password" id="confirmPassword" type="password"
                value={confirmPassword} onChange={setConfirmPassword}
                placeholder="Repeat new password"
              />
            </div>

            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-rose-400">Passwords do not match.</p>
            )}

            <SubmitButton label="Change Password" pending={passwordPending} />
          </form>
        </Card>

        {/* ── Danger zone ────────────────────────────────────── */}
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 px-6 py-5">
          <h3 className="text-sm font-bold text-rose-300">Sign Out</h3>
          <p className="mt-0.5 text-xs text-rose-400/70">End your current admin session.</p>
          <button
            onClick={handleLogout}
            disabled={logoutPending}
            className="mt-4 rounded-lg border border-rose-500/25 bg-white/5 px-4 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/10 disabled:opacity-60"
          >
            Sign out of admin portal
          </button>
        </div>
      </main>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
