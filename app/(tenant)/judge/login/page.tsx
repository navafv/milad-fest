'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { loginJudge } from '../actions/judge-actions';
import { getActiveTenantSubdomain } from '../actions/tenant-actions';

export default function JudgeLoginPage() {
  const router = useRouter();

  const [subdomain, setSubdomain] = useState('');
  const [subdomainLoading, setSubdomainLoading] = useState(true);
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    (async () => {
      const resolved = await getActiveTenantSubdomain();
      setSubdomain(resolved);
      setSubdomainLoading(false);
      if (!resolved) {
        setError('Could not determine your Madrassa. Please use the link provided by your Madrassa admin.');
      }
    })();
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!subdomain) {
      setError('Could not determine your Madrassa. Please use the link provided by your Madrassa admin.');
      return;
    }
    if (!/^\d{10,15}$/.test(phone)) {
      setError('Enter a valid phone number.');
      return;
    }
    if (!/^\d{4,6}$/.test(pin)) {
      setError('PIN must be 4-6 digits.');
      return;
    }

    startTransition(async () => {
      const result = await loginJudge(subdomain, phone, pin);
      if (result.success) {
        router.push(`/judge/dashboard`);
      } else {
        setError(result.message ?? 'Login failed.');
      }
    });
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-emerald-900 via-emerald-800 to-emerald-950 px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 text-emerald-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Judge Portal</h1>
          <p className="text-emerald-200/70 text-sm mt-1">
            Milad Fest &middot; {subdomainLoading ? '…' : subdomain || 'Unknown Madrassa'}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl"
        >
          <div className="mb-4">
            <label htmlFor="phone" className="block text-xs font-medium text-emerald-200/80 mb-1.5">
              Phone Number
            </label>
            <input
              id="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              placeholder="9876543210"
              maxLength={15}
              className="w-full rounded-xl bg-white/10 border border-white/10 text-white placeholder-white/40 px-4 py-3 text-base tracking-wide outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition"
            />
          </div>

          <div className="mb-2">
            <label htmlFor="pin" className="block text-xs font-medium text-emerald-200/80 mb-1.5">
              PIN
            </label>
            <div className="relative">
              <input
                id="pin"
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                autoComplete="current-password"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                maxLength={6}
                className="w-full rounded-xl bg-white/10 border border-white/10 text-white placeholder-white/40 pl-4 pr-12 py-3 text-base tracking-[0.4em] outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition"
              />
              <button
                type="button"
                onClick={() => setShowPin((v) => !v)}
                aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
                aria-pressed={showPin}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 w-9 flex items-center justify-center text-emerald-200/60 hover:text-emerald-200 transition"
              >
                {showPin ? (
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
                      d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.243 4.243L9.88 9.88"
                    />
                  </svg>
                ) : (
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
                      d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                    />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <p
              role="alert"
              aria-live="assertive"
              className="text-red-300 text-sm mt-3 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending || subdomainLoading}
            className="w-full mt-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/50 text-emerald-950 font-semibold py-3.5 min-h-[44px] text-base transition active:scale-[0.98]"
          >
            {isPending ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-emerald-200/40 text-xs mt-6">
          Blind judging &middot; Scores are final once submitted
        </p>
      </div>
    </div>
  );
}
