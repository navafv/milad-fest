'use client';

import { useState, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { loginJudge } from '../actions/judge-actions';

export default function JudgeLoginPage() {
  const router = useRouter();
  const params = useParams();
  const subdomain = (params?.subdomain as string) ?? '';

  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

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
          <p className="text-emerald-200/70 text-sm mt-1">Milad Fest &middot; {subdomain}</p>
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
              className="w-full rounded-xl bg-white/10 border border-white/10 text-white placeholder-white/30 px-4 py-3 text-base tracking-wide outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition"
            />
          </div>

          <div className="mb-2">
            <label htmlFor="pin" className="block text-xs font-medium text-emerald-200/80 mb-1.5">
              PIN
            </label>
            <input
              id="pin"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              maxLength={6}
              className="w-full rounded-xl bg-white/10 border border-white/10 text-white placeholder-white/30 px-4 py-3 text-base tracking-[0.4em] outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition"
            />
          </div>

          {error && (
            <p className="text-red-300 text-sm mt-3 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full mt-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/50 text-emerald-950 font-semibold py-3.5 text-base transition active:scale-[0.98]"
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