import Link from 'next/link';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      <nav className="sticky top-0 z-20 bg-slate-950/90 backdrop-blur-lg border-b border-white/5">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-emerald-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-1.483 0"
                />
              </svg>
            </div>
            <span className="text-white font-bold tracking-tight">Milad Fest</span>
          </Link>

          <div className="flex items-center gap-1">
            <Link
              href="/"
              className="text-sm text-slate-300 hover:text-white hover:bg-white/5 px-3.5 py-2 rounded-lg transition"
            >
              Home
            </Link>
            <Link
              href="/schedule"
              className="text-sm text-slate-300 hover:text-white hover:bg-white/5 px-3.5 py-2 rounded-lg transition"
            >
              Schedule
            </Link>
            <Link
              href="/results"
              className="text-sm text-slate-300 hover:text-white hover:bg-white/5 px-3.5 py-2 rounded-lg transition"
            >
              Results
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-white/5 py-8">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <p className="text-slate-500 text-sm">
            Powered by <span className="text-slate-300 font-medium">Thahvare Milad</span> | Built by{' '}
            <span className="text-slate-300 font-medium">[Your Name]</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
