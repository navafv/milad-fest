import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-slate-50">
      <div className="text-center space-y-6 max-w-2xl">
        <h1 className="text-5xl font-bold text-slate-900">Welcome to Milad Fest</h1>
        <p className="text-xl text-slate-600">
          The ultimate platform for managing events, schedules, and results.
        </p>
        
        <div className="flex flex-wrap gap-4 justify-center pt-8">
          <Link 
            href="/schedule" 
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
          >
            View Public Schedule
          </Link>
          <Link 
            href="/admin/login" 
            className="px-6 py-3 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition"
          >
            Admin Access
          </Link>
          <Link 
            href="/judge/login" 
            className="px-6 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition"
          >
            Judge Portal
          </Link>
        </div>
      </div>
    </main>
  );
}
