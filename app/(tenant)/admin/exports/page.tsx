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
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">
        Printables, Certificates &amp; Data Export
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        Generate ID cards, export results, and issue digital certificates.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Results CSV */}
        <section className="flex flex-col justify-between rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Download Results CSV
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Export all published results — participant name, code, event,
              rank, and points — as a CSV file.
            </p>
          </div>
          <div className="mt-4">
            <button
              type="button"
              onClick={handleDownloadResults}
              disabled={isPending}
              className="inline-flex w-full items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Preparing CSV..." : "Download Results CSV"}
            </button>
            {error && (
              <p className="mt-2 text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
          </div>
        </section>

        {/* ID Cards */}
        <section className="flex flex-col justify-between rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Print ID Cards
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Open a print-optimized grid of student ID cards with register
              numbers, teams, and registered events.
            </p>
          </div>
          <div className="mt-4">
            <Link
              href="/admin/exports/id-cards"
              className="inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              Open ID Cards
            </Link>
          </div>
        </section>

        {/* Certificates */}
        <section className="flex flex-col justify-between rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Certificates
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Certificates are generated on-the-fly as images via a public
              API endpoint. No storage required — just build a URL.
            </p>
            <div className="mt-3 rounded-md bg-gray-50 p-3">
              <p className="text-xs font-medium text-gray-500">
                Endpoint format:
              </p>
              <code className="mt-1 block break-all text-xs text-gray-700">
                /api/certificate?madrassaName=YOUR_MADRASSA&amp;studentName=STUDENT_NAME&amp;eventName=EVENT_NAME&amp;rank=1
              </code>
            </div>
            <p className="mt-3 text-sm text-gray-600">
              Share this URL directly, embed it in an{" "}
              <code className="text-xs">&lt;img&gt;</code> tag, or link it
              from result rows so students can view/download their
              certificate.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
