"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

interface CertificateRow {
  id: string;
  participantName: string;
  eventName: string;
  rank: number;
}

interface CertificateManagerPageProps {
  params?: { madrassaId?: string };
  searchParams?: { madrassaId?: string; madrassaName?: string };
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

export default function CertificateManagerPage({
  params,
  searchParams,
}: CertificateManagerPageProps) {
  const madrassaId = params?.madrassaId ?? searchParams?.madrassaId ?? "";
  const madrassaName = searchParams?.madrassaName ?? "Milad Fest";

  const [rows, setRows] = useState<CertificateRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [rankFilter, setRankFilter] = useState<"all" | "1" | "2" | "3">("all");

  const supabase = useMemo(() => createClient(), []);

  const loadResults = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("results")
        .select(
          `
          id,
          rank,
          students:student_id ( name ),
          event_subgroups:event_subgroup_id ( name ),
          events:event_id ( name, madrassa_id )
        `
        )
        .eq("is_published", true)
        .in("rank", [1, 2, 3])
        .eq("events.madrassa_id", madrassaId)
        .order("rank", { ascending: true });

      if (fetchError) {
        console.error("Failed to fetch results:", fetchError);
        setError("Failed to load results. Please try again.");
        setRows([]);
        return;
      }

      const mapped: CertificateRow[] = (data ?? [])
        .filter((r: any) => r.events)
        .map((r: any) => {
          const student = Array.isArray(r.students)
            ? r.students[0]
            : r.students;
          const squad = Array.isArray(r.event_subgroups)
            ? r.event_subgroups[0]
            : r.event_subgroups;
          const event = Array.isArray(r.events) ? r.events[0] : r.events;

          const participantName =
            student?.name ?? squad?.name ?? "Unknown Participant";

          return {
            id: r.id,
            participantName,
            eventName: event?.name ?? "Unknown Event",
            rank: r.rank,
          };
        });

      setRows(mapped);
    } catch (err) {
      console.error("Unexpected error fetching results:", err);
      setError("An unexpected error occurred. Please try again.");
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, madrassaId]);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  const buildCertificateUrl = useCallback(
    (row: CertificateRow) => {
      const url = new URL("/api/certificate", window.location.origin);
      url.searchParams.set("madrassaName", madrassaName);
      url.searchParams.set("studentName", row.participantName);
      url.searchParams.set("eventName", row.eventName);
      url.searchParams.set("rank", String(row.rank));
      return url.toString();
    },
    [madrassaName]
  );

  const handlePreview = useCallback(
    (row: CertificateRow) => {
      const url = buildCertificateUrl(row);
      window.open(url, "_blank", "noopener,noreferrer");
    },
    [buildCertificateUrl]
  );

  const handleDownload = useCallback(
    async (row: CertificateRow) => {
      setDownloadingId(row.id);
      try {
        const url = buildCertificateUrl(row);
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`Failed to fetch certificate (${response.status})`);
        }

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);

        const safeName = row.participantName
          .trim()
          .replace(/[^a-zA-Z0-9\s-]/g, "")
          .replace(/\s+/g, "-");
        const safeEvent = row.eventName
          .trim()
          .replace(/[^a-zA-Z0-9\s-]/g, "")
          .replace(/\s+/g, "-");
        const filename = `${ordinal(row.rank)}-${safeEvent}-${safeName}.png`;

        const link = document.createElement("a");
        link.href = objectUrl;
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(objectUrl);
      } catch (err) {
        console.error("Failed to download certificate:", err);
        setError(
          `Failed to download certificate for ${row.participantName}. Please try again.`
        );
      } finally {
        setDownloadingId(null);
      }
    },
    [buildCertificateUrl]
  );

  const buildWhatsAppUrl = useCallback(
    (row: CertificateRow) => {
      const certUrl = buildCertificateUrl(row);
      const message = `Congratulations ${row.participantName} for securing ${ordinal(
        row.rank
      )} place in ${row.eventName}! View your certificate here: ${certUrl}`;
      return `https://wa.me/?text=${encodeURIComponent(message)}`;
    },
    [buildCertificateUrl]
  );

  const filteredRows = useMemo(() => {
    if (rankFilter === "all") return rows;
    return rows.filter((r) => String(r.rank) === rankFilter);
  }, [rows, rankFilter]);

  const rankBadgeClasses: Record<number, string> = {
    1: "bg-yellow-100 text-yellow-800 border-yellow-300",
    2: "bg-gray-100 text-gray-700 border-gray-300",
    3: "bg-orange-100 text-orange-800 border-orange-300",
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Certificate Manager
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Preview, download, and share digital certificates for top-ranked
            students and squads. Certificates are generated on the fly — no
            storage required.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="rank-filter" className="text-sm text-gray-600">
            Filter:
          </label>
          <select
            id="rank-filter"
            value={rankFilter}
            onChange={(e) =>
              setRankFilter(e.target.value as "all" | "1" | "2" | "3")
            }
            className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Ranks</option>
            <option value="1">1st Place</option>
            <option value="2">2nd Place</option>
            <option value="3">3rd Place</option>
          </select>
          <button
            type="button"
            onClick={loadResults}
            disabled={isLoading}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="px-6 py-12 text-center text-sm text-gray-500">
            Loading results...
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-500">
            No published top-3 results found.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Student / Squad
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Event
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Rank
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {row.participantName}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {row.eventName}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                        rankBadgeClasses[row.rank] ??
                        "border-gray-300 bg-gray-100 text-gray-700"
                      }`}
                    >
                      {ordinal(row.rank)} Place
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handlePreview(row)}
                        className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownload(row)}
                        disabled={downloadingId === row.id}
                        className="rounded-md border border-blue-300 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 shadow-sm transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {downloadingId === row.id
                          ? "Downloading..."
                          : "Download"}
                      </button>
                      <a
                        href={buildWhatsAppUrl(row)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 shadow-sm transition hover:bg-emerald-100"
                      >
                        WhatsApp
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
