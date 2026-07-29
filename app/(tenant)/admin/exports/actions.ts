"use server";

import { createClient } from "@/lib/supabase/server";

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

export async function getResultsForExport(
  madrassaId: string
): Promise<ResultExportRow[]> {
  const supabase = await createClient();

  const { data: results, error } = await supabase
    .from("results")
    .select(
      `
      rank,
      points,
      students:student_id ( name, register_number_3digit ),
      events:event_id ( name, madrassa_id )
    `
    )
    .eq("published", true)
    .eq("events.madrassa_id", madrassaId)
    .order("rank", { ascending: true });

  if (error) {
    console.error("getResultsForExport error:", error);
    throw new Error("Failed to fetch results for export.");
  }

  if (!results) return [];

  return results
    .filter((r: any) => r.events)
    .map((r: any) => {
      const student = Array.isArray(r.students) ? r.students[0] : r.students;
      const event = Array.isArray(r.events) ? r.events[0] : r.events;

      return {
        participant_name: student?.name ?? "Unknown",
        participant_code: student?.register_number_3digit ?? "",
        event_name: event?.name ?? "Unknown",
        rank: r.rank ?? "",
        points: r.points ?? "",
      };
    });
}
