"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { getResultsForExport, type ResultExportRow } from "./actions";

function toCsv(rows: ResultExportRow[]): string {
  const headers = [
    "Participant Name",
    "Participant Code",
    "Event Name",
    "Rank",
    "Points",
  ];

  const escapeCell = (value: string | number) => {
    const str = String(value ?? "");
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      [
        escapeCell(r.participant_name),
        escapeCell(r.participant_code),
        escapeCell(r.event_name),
        escapeCell(r.rank),
        escapeCell(r.points),
      ].join(",")
    ),
  ];

  return lines.join("\n");
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function ExportsPage({
  params,
}: {
  params?: { madrassaId?: string };
}) {
  const madrassaId = params?.madrassaId ?? "";
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDownloadResults = () => {
    setError(null);
    startTransition(async () => {
      try {
        const results = await getResultsForExport(madrassaId);
        if (!results.length) {
          setError("No published results found to export.");
          return;
        }
        const csv = toCsv(results);
        const date = new Date().toISOString().split("T")[0];
        downloadCsv(csv, `results-export-${date}.csv`);
      } catch (err) {
        console.error(err);
        setError("Failed to generate results CSV. Please try again.");
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold text-white">
          Printables, Certificates &amp; Data Export
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Generate ID cards, export results, and issue digital certificates.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Results CSV */}
          <section className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-6">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Download Results CSV
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Export all published results — participant name, code, event,
                rank, and points — as a CSV file.
              </p>
            </div>
            <div className="mt-4">
              <button
                type="button"
                onClick={handleDownloadResults}
                disabled={isPending}
                className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
              >
                {isPending ? "Preparing CSV..." : "Download Results CSV"}
              </button>
              {error && (
                <p className="mt-2 text-sm text-red-300" role="alert">
                  {error}
                </p>
              )}
            </div>
          </section>

          {/* ID Cards */}
          <section className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-6">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Print ID Cards
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Open a print-optimized grid of student ID cards with register
                numbers, teams, and registered events.
              </p>
            </div>
            <div className="mt-4">
              <Link
                href="/admin/exports/id-cards"
                className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 active:scale-[0.98]"
              >
                Open ID Cards
              </Link>
            </div>
          </section>

          {/* Certificates */}
          <section className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-6">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Certificates
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Certificates are generated on-the-fly as images via a public
                API endpoint. No storage required — just build a URL.
              </p>
              <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <p className="text-xs font-medium text-slate-500">
                  Endpoint format:
                </p>
                <code className="mt-1 block break-all text-xs text-slate-300">
                  /api/certificate?madrassaName=YOUR_MADRASSA&amp;studentName=STUDENT_NAME&amp;eventName=EVENT_NAME&amp;rank=1
                </code>
              </div>
              <p className="mt-3 text-sm text-slate-400">
                Share this URL directly, embed it in an{" "}
                <code className="text-xs text-slate-300">&lt;img&gt;</code> tag, or link it
                from result rows so students can view/download their
                certificate.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
