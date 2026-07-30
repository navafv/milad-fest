export const dynamic = "force-dynamic";

import { getStudentsForIdCards } from "../actions";
import { PrintButton } from "./print-button";

export default async function IdCardsPage({
  searchParams,
}: {
  searchParams?: { madrassaId?: string; madrassaName?: string };
}) {
  const madrassaId = searchParams?.madrassaId ?? "";
  const madrassaName = searchParams?.madrassaName ?? "Milad Fest";

  const students = await getStudentsForIdCards(madrassaId);

  return (
    <div className="id-card-print-root bg-slate-950 print:bg-white">
      {/* Screen-only toolbar, hidden when printing */}
      <div className="no-print sticky top-0 z-10 flex items-center justify-between border-b border-white/5 bg-slate-950/90 backdrop-blur-lg px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-white">
            ID Cards — {madrassaName}
          </h1>
          <p className="text-sm text-slate-500">
            {students.length} student{students.length === 1 ? "" : "s"} found
          </p>
        </div>
        <PrintButton />
      </div>

      {students.length === 0 ? (
        <p className="no-print px-6 py-12 text-center text-sm text-slate-500">
          No students found for this madrassa.
        </p>
      ) : (
        <div className="id-card-grid grid grid-cols-2 gap-4 p-6 print:grid-cols-2 print:gap-2 print:p-0">
          {students.map((student) => (
            <div
              key={student.id}
              className="id-card relative flex h-[54mm] w-[86mm] flex-col justify-between overflow-hidden rounded-md border-2 border-gray-800 bg-white p-3 text-black"
            >
              <div className="flex items-start justify-between">
                <p className="text-[9px] font-bold uppercase tracking-wide leading-tight">
                  {madrassaName}
                </p>
                <span className="rounded bg-gray-900 px-1.5 py-0.5 text-[8px] font-bold text-white">
                  ID CARD
                </span>
              </div>

              <div className="mt-1 flex flex-1 flex-col items-center justify-center text-center">
                <p className="text-2xl font-extrabold leading-none tracking-wider">
                  {student.register_number_3digit}
                </p>
                <p className="mt-1 text-sm font-semibold leading-tight">
                  {student.name}
                </p>
                <p className="text-[10px] text-gray-700">
                  {student.class_name ?? "—"}
                  {student.team_name ? ` · ${student.team_name}` : ""}
                </p>
              </div>

              <div className="mt-1 border-t border-gray-300 pt-1">
                <p className="text-[8px] font-semibold uppercase text-gray-500">
                  Events
                </p>
                <p className="line-clamp-2 text-[8px] leading-tight text-gray-800">
                  {student.events.length > 0
                    ? student.events.join(", ")
                    : "No events registered"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 8mm;
          }
          .no-print,
          nav,
          header,
          footer,
          [data-app-navbar],
          [data-app-header],
          [data-app-sidebar] {
            display: none !important;
          }
          .id-card-print-root {
            padding: 0 !important;
            margin: 0 !important;
          }
          .id-card-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 86mm) !important;
            gap: 4mm !important;
          }
          .id-card {
            width: 86mm !important;
            height: 54mm !important;
            break-inside: avoid;
            page-break-inside: avoid;
            border: 2px solid #000 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}
