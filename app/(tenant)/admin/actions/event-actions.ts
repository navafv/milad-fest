"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ── Create Event ───────────────────────────────────────────────────────────

export async function createEvent({
  madrassaId,
  name,
  categoryId,
  isGeneral,
  genderRule,
  isGroupEvent,
  groupStrength,
  pointsSingle,
  pointsGroup,
}: {
  madrassaId: string;
  name: string;
  categoryId: string | null;
  isGeneral: boolean;
  genderRule: "male" | "female" | "mixed";
  isGroupEvent: boolean;
  groupStrength: number;
  pointsSingle: string;
  pointsGroup: string;
}) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .insert({
      madrassa_id: madrassaId,
      name,
      category_id: isGeneral ? null : categoryId,
      is_general: isGeneral,
      gender_rule: genderRule,
      is_group_event: isGroupEvent,
      group_strength: isGroupEvent ? groupStrength : null,
      points_single: pointsSingle,
      points_group: isGroupEvent ? pointsGroup : null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/admin/events");
  return data;
}

// ── Generate Subgroups & Code Letters ─────────────────────────────────────

export async function generateSubgroupsAndCodeLetters(
  madrassaId: string,
  eventId: string,
  prefixLetter: string
) {
  const supabase = await createClient();

  // Fetch event details
  const { data: event, error: eventErr } = await supabase
    .from("events")
    .select("is_group_event, group_strength")
    .eq("id", eventId)
    .single();

  if (eventErr) throw new Error(eventErr.message);

  // Fetch all registrations for this event
  const { data: registrations, error: regErr } = await supabase
    .from("event_registrations")
    .select("id, student_id, team_id")
    .eq("event_id", eventId)
    .eq("madrassa_id", madrassaId);

  if (regErr) throw new Error(regErr.message);
  if (!registrations || registrations.length === 0)
    throw new Error("No registrations found for this event.");

  // Delete existing subgroups for this event to allow regeneration
  await supabase
    .from("event_subgroups")
    .delete()
    .eq("event_id", eventId)
    .eq("madrassa_id", madrassaId);

  const subgroupsToInsert: Record<string, unknown>[] = [];
  let codeIndex = 1;

  if (event.is_group_event) {
    // Group by team_id
    const teamMap: Record<string, typeof registrations> = {};
    for (const reg of registrations) {
      const key = reg.team_id ?? "no_team";
      if (!teamMap[key]) teamMap[key] = [];
      teamMap[key].push(reg);
    }

    const strength = event.group_strength ?? 2;

    for (const [teamId, members] of Object.entries(teamMap)) {
      // Split into squads of size `strength`
      let squadIndex = 1;
      for (let i = 0; i < members.length; i += strength) {
        const squad = members.slice(i, i + strength);
        const codeLabel = `${prefixLetter}${codeIndex}`;

        subgroupsToInsert.push({
          madrassa_id: madrassaId,
          event_id: eventId,
          team_id: teamId === "no_team" ? null : teamId,
          squad_index: squadIndex,
          code_letter: codeLabel,
          member_registration_ids: squad.map((m) => m.id),
          member_student_ids: squad.map((m) => m.student_id),
        });

        codeIndex++;
        squadIndex++;
      }
    }
  } else {
    // Individual event — one subgroup entry per registration
    for (const reg of registrations) {
      const codeLabel = `${prefixLetter}${codeIndex}`;
      subgroupsToInsert.push({
        madrassa_id: madrassaId,
        event_id: eventId,
        team_id: reg.team_id ?? null,
        squad_index: null,
        code_letter: codeLabel,
        member_registration_ids: [reg.id],
        member_student_ids: [reg.student_id],
      });
      codeIndex++;
    }
  }

  const { data, error: insertErr } = await supabase
    .from("event_subgroups")
    .insert(subgroupsToInsert)
    .select();

  if (insertErr) throw new Error(insertErr.message);

  revalidatePath("/admin/events");
  return data;
}

// ── Create Stage ──────────────────────────────────────────────────────────

export async function createStage(madrassaId: string, stageName: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("stages")
    .insert({ madrassa_id: madrassaId, name: stageName })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/admin/events");
  return data;
}

// ── Schedule Event ────────────────────────────────────────────────────────

export async function scheduleEvent(
  madrassaId: string,
  eventId: string,
  stageId: string,
  startTime: string
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("event_schedules")
    .upsert(
      {
        madrassa_id: madrassaId,
        event_id: eventId,
        stage_id: stageId,
        start_time: startTime,
        status: "upcoming",
      },
      { onConflict: "event_id,madrassa_id" }
    )
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/admin/events");
  return data;
}
