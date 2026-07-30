"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdminSession } from "@/lib/utils/tenant-auth";

export interface StudentIdCardData {
  id: string;
  register_number_3digit: string;
  name: string;
  class_name: string | null;
  team_id: string | null;
  team_name: string | null;
  events: string[];
}

export interface ResultExportRow {
  participant_name: string;
  participant_code: string;
  event_name: string;
  rank: number | string;
  points: number | string;
}

export async function getStudentsForIdCards(
  madrassaId: string
): Promise<StudentIdCardData[]> {
  await requireAdminSession(madrassaId);

  const supabase = await createClient();

  const { data: students, error } = await supabase
    .from("students")
    .select(
      `
      id,
      register_number_3digit,
      name,
      class_name,
      team_id,
      teams:team_id ( id, name ),
      event_registrations (
        events ( id, name )
      )
    `
    )
    .eq("madrassa_id", madrassaId)
    .order("register_number_3digit", { ascending: true });

  if (error) {
    console.error("getStudentsForIdCards error:", error);
    throw new Error("Failed to fetch students for ID cards.");
  }

  if (!students) return [];

  return students.map((s: any) => {
    const events: string[] = Array.isArray(s.event_registrations)
      ? s.event_registrations
          .map((reg: any) => reg?.events?.name)
          .filter((name: unknown): name is string => Boolean(name))
      : [];

    const team = Array.isArray(s.teams) ? s.teams[0] : s.teams;

    return {
      id: s.id,
      register_number_3digit: s.register_number_3digit,
      name: s.name,
      class_name: s.class_name,
      team_id: s.team_id,
      team_name: team?.name ?? null,
      events,
    };
  });
}

/**
 * Exports published results as flat rows suitable for CSV.
 *
 * NOTE: the `results` table has no direct `student_id` foreign key and no
 * `rank`/`points` columns of the shape previously assumed here — winners
 * are stored polymorphically via `participant_id` + `participant_type`
 * ('individual' | 'squad'), with `final_rank` and `points_awarded` as the
 * actual column names. Individual participant names/register numbers are
 * looked up separately from `students`; squad winners are labeled by their
 * code letter since they have no single student record to attach a name to.
 */
export async function getResultsForExport(
  madrassaId: string
): Promise<ResultExportRow[]> {
  await requireAdminSession(madrassaId);

  const supabase = await createClient();

  const { data: results, error } = await supabase
    .from("results")
    .select(
      `
      final_rank,
      points_awarded,
      code_letter,
      participant_type,
      participant_id,
      events:event_id ( name, madrassa_id )
    `
    )
    .eq("madrassa_id", madrassaId)
    .eq("is_published", true)
    .eq("events.madrassa_id", madrassaId)
    .order("final_rank", { ascending: true });

  if (error) {
    console.error("getResultsForExport error:", error);
    throw new Error("Failed to fetch results for export.");
  }

  if (!results) return [];

  // Only individual winners need a name/register-number lookup from `students`;
  // squad winners are represented by their code letter instead.
  const individualIds = results
    .filter((r: any) => r.participant_type === "individual")
    .map((r: any) => r.participant_id);

  const uniqueIndividualIds = [...new Set(individualIds)];

  const { data: studentRows, error: studentsError } = uniqueIndividualIds.length
    ? await supabase
        .from("students")
        .select("id, name, register_number_3digit")
        .in("id", uniqueIndividualIds)
        .eq("madrassa_id", madrassaId)
    : { data: [] as any[], error: null };

  if (studentsError) {
    console.error("getResultsForExport student lookup error:", studentsError);
    throw new Error("Failed to fetch students for export.");
  }

  const studentMap = new Map((studentRows ?? []).map((s: any) => [s.id, s]));

  return results
    .filter((r: any) => r.events)
    .map((r: any) => {
      const event = Array.isArray(r.events) ? r.events[0] : r.events;
      const student =
        r.participant_type === "individual" ? studentMap.get(r.participant_id) : null;

      return {
        participant_name:
          r.participant_type === "individual"
            ? student?.name ?? "Unknown"
            : `Squad ${r.code_letter}`,
        participant_code:
          r.participant_type === "individual"
            ? student?.register_number_3digit ?? ""
            : r.code_letter ?? "",
        event_name: event?.name ?? "Unknown",
        rank: r.final_rank ?? "",
        points: r.points_awarded ?? "",
      };
    });
}
