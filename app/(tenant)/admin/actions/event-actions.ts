"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/app/(tenant)/admin/actions/auth-actions";

interface ActionResult<T = undefined> {
  success: boolean;
  message?: string;
  data?: T;
}

// ── Get Events ─────────────────────────────────────────────────────────────
// Fetches all events for the authenticated admin's tenant. Used to populate
// the Events & Squads table on page load — previously the page only ever
// showed events created during the current browser session.

export async function getEvents(): Promise<ActionResult<any[]>> {
  try {
    const session = await verifySession();
    if (!session) return { success: false, message: "Unauthorized" };
    const madrassaId = session.madrassa_id;

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("events")
      .select(
        "id, name, gender_rule, is_group_event, group_strength, points_single, points_group, is_general, category_id"
      )
      .eq("madrassa_id", madrassaId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("getEvents error:", error);
      return { success: false, message: "Failed to load events." };
    }

    return { success: true, data: data ?? [] };
  } catch (error) {
    console.error("getEvents error:", error);
    return { success: false, message: "Failed to load events." };
  }
}

// ── Get Stages ─────────────────────────────────────────────────────────────

export async function getStages(): Promise<ActionResult<any[]>> {
  try {
    const session = await verifySession();
    if (!session) return { success: false, message: "Unauthorized" };
    const madrassaId = session.madrassa_id;

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("stages")
      .select("id, name")
      .eq("madrassa_id", madrassaId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("getStages error:", error);
      return { success: false, message: "Failed to load stages." };
    }

    return { success: true, data: data ?? [] };
  } catch (error) {
    console.error("getStages error:", error);
    return { success: false, message: "Failed to load stages." };
  }
}

// ── Get Schedules ──────────────────────────────────────────────────────────
// Returns event_schedules joined with the event name and stage name so the
// Schedule Board can render immediately on load without extra client-side
// lookups.

export async function getSchedules(): Promise<ActionResult<any[]>> {
  try {
    const session = await verifySession();
    if (!session) return { success: false, message: "Unauthorized" };
    const madrassaId = session.madrassa_id;

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("event_schedules")
      .select(
        "id, event_id, stage_id, start_time, status, events(name), stages(name)"
      )
      .eq("madrassa_id", madrassaId)
      .order("start_time", { ascending: true });

    if (error) {
      console.error("getSchedules error:", error);
      return { success: false, message: "Failed to load schedules." };
    }

    const normalized = (data ?? []).map((row: any) => ({
      id: row.id,
      event_id: row.event_id,
      stage_id: row.stage_id,
      start_time: row.start_time,
      status: row.status,
      eventName: row.events?.name ?? row.event_id,
      stageName: row.stages?.name ?? row.stage_id,
    }));

    return { success: true, data: normalized };
  } catch (error) {
    console.error("getSchedules error:", error);
    return { success: false, message: "Failed to load schedules." };
  }
}

// ── Create Event ───────────────────────────────────────────────────────────

export async function createEvent({
  name,
  categoryId,
  isGeneral,
  genderRule,
  isGroupEvent,
  groupStrength,
  pointsSingle,
  pointsGroup,
}: {
  name: string;
  categoryId: string | null;
  isGeneral: boolean;
  genderRule: "male" | "female" | "mixed";
  isGroupEvent: boolean;
  groupStrength: number;
  pointsSingle: string;
  pointsGroup: string;
}): Promise<ActionResult<any>> {
  try {
    const session = await verifySession();
    if (!session) return { success: false, message: "Unauthorized" };
    const madrassaId = session.madrassa_id;

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
      } as any)
      .select()
      .single();

    if (error) {
      console.error("createEvent error:", error);
      return { success: false, message: "Failed to create event." };
    }

    revalidatePath("/admin/events");
    return { success: true, data };
  } catch (error) {
    console.error("createEvent error:", error);
    return { success: false, message: "Failed to create event." };
  }
}

// ── Delete Event ───────────────────────────────────────────────────────────
// Deletes an event and everything downstream of it that references
// event_id, scoped to the authenticated admin's tenant throughout. Child
// rows are removed first so this doesn't trip foreign-key constraints,
// regardless of whether ON DELETE CASCADE is configured in the DB.

export async function deleteEvent(eventId: string): Promise<ActionResult> {
  try {
    const session = await verifySession();
    if (!session) return { success: false, message: "Unauthorized" };
    const madrassaId = session.madrassa_id;

    const supabase = await createClient();

    // Confirm the event actually belongs to this tenant before touching
    // anything, rather than relying on the eq() filters below alone.
    const { data: event, error: eventCheckError } = await supabase
      .from("events")
      .select("id")
      .eq("id", eventId)
      .eq("madrassa_id", madrassaId)
      .maybeSingle();

    if (eventCheckError) {
      console.error("deleteEvent ownership check error:", eventCheckError);
      return { success: false, message: "Failed to delete event." };
    }
    if (!event) {
      return { success: false, message: "Event not found." };
    }

    const childTables = [
      "scores",
      "rank_overrides",
      "results",
      "event_judges",
      "event_participants",
      "event_squads",
      "event_subgroups",
      "event_registrations",
      "event_schedules",
    ] as const;

    for (const table of childTables) {
      const { error: childError } = await supabase
        .from(table)
        .delete()
        .eq("event_id", eventId)
        .eq("madrassa_id", madrassaId);

      // Some of these tables may not exist in every deployment's schema —
      // ignore "relation does not exist" style errors (Postgres code 42P01)
      // but surface anything else, since a real failure here would leave
      // orphaned child rows behind.
      if (childError && (childError as any).code !== "42P01") {
        console.error(`deleteEvent cleanup error (${table}):`, childError);
        return { success: false, message: "Failed to delete related event data." };
      }
    }

    const { error: deleteError } = await supabase
      .from("events")
      .delete()
      .eq("id", eventId)
      .eq("madrassa_id", madrassaId);

    if (deleteError) {
      console.error("deleteEvent error:", deleteError);
      return { success: false, message: "Failed to delete event." };
    }

    revalidatePath("/admin/events");
    return { success: true };
  } catch (error) {
    console.error("deleteEvent error:", error);
    return { success: false, message: "Failed to delete event." };
  }
}

// ── Generate Subgroups & Code Letters ─────────────────────────────────────

export async function generateSubgroupsAndCodeLetters(
  eventId: string,
  prefixLetter: string
): Promise<ActionResult<any>> {
  try {
    const session = await verifySession();
    if (!session) return { success: false, message: "Unauthorized" };
    const madrassaId = session.madrassa_id;

    const supabase = await createClient();

    // Fetch event details
    const { data: rawEvent, error: eventErr } = await supabase
      .from("events")
      .select("is_group_event, group_strength")
      .eq("id", eventId)
      .eq("madrassa_id", madrassaId)
      .single();

    if (eventErr) {
      console.error("generateSubgroupsAndCodeLetters event fetch error:", eventErr);
      return { success: false, message: "Failed to load event details." };
    }

    // Cast to any to bypass strict TypeScript checking
    const event = rawEvent as any;

    // Fetch all registrations for this event
    const { data: rawRegistrations, error: regErr } = await supabase
      .from("event_registrations")
      .select("id, student_id, team_id")
      .eq("event_id", eventId)
      .eq("madrassa_id", madrassaId);

    if (regErr) {
      console.error("generateSubgroupsAndCodeLetters registrations fetch error:", regErr);
      return { success: false, message: "Failed to load registrations." };
    }

    const registrations = (rawRegistrations as any[]) || [];
    if (registrations.length === 0) {
      return { success: false, message: "No registrations found for this event." };
    }

    // Delete existing subgroups for this event to allow regeneration
    const { error: deleteErr } = await supabase
      .from("event_subgroups")
      .delete()
      .eq("event_id", eventId)
      .eq("madrassa_id", madrassaId);

    if (deleteErr) {
      console.error("generateSubgroupsAndCodeLetters delete error:", deleteErr);
      return { success: false, message: "Failed to reset existing subgroups." };
    }

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
            member_registration_ids: squad.map((m: any) => m.id),
            member_student_ids: squad.map((m: any) => m.student_id),
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
      .insert(subgroupsToInsert as any)
      .select();

    if (insertErr) {
      console.error("generateSubgroupsAndCodeLetters insert error:", insertErr);
      return { success: false, message: "Failed to generate subgroups." };
    }

    revalidatePath("/admin/events");
    return { success: true, data };
  } catch (error) {
    console.error("generateSubgroupsAndCodeLetters error:", error);
    return { success: false, message: "Failed to generate subgroups and code letters." };
  }
}

// ── Create Stage ──────────────────────────────────────────────────────────

export async function createStage(
  stageName: string
): Promise<ActionResult<any>> {
  try {
    const session = await verifySession();
    if (!session) return { success: false, message: "Unauthorized" };
    const madrassaId = session.madrassa_id;

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("stages")
      .insert({ madrassa_id: madrassaId, name: stageName } as any)
      .select()
      .single();

    if (error) {
      console.error("createStage error:", error);
      return { success: false, message: "Failed to create stage." };
    }

    revalidatePath("/admin/events");
    return { success: true, data };
  } catch (error) {
    console.error("createStage error:", error);
    return { success: false, message: "Failed to create stage." };
  }
}

// ── Delete Stage ───────────────────────────────────────────────────────────
// Removes any schedule entries pinned to this stage first (so events aren't
// left pointing at a deleted stage), then deletes the stage itself.

export async function deleteStage(stageId: string): Promise<ActionResult> {
  try {
    const session = await verifySession();
    if (!session) return { success: false, message: "Unauthorized" };
    const madrassaId = session.madrassa_id;

    const supabase = await createClient();

    const { data: stage, error: stageCheckError } = await supabase
      .from("stages")
      .select("id")
      .eq("id", stageId)
      .eq("madrassa_id", madrassaId)
      .maybeSingle();

    if (stageCheckError) {
      console.error("deleteStage ownership check error:", stageCheckError);
      return { success: false, message: "Failed to delete stage." };
    }
    if (!stage) {
      return { success: false, message: "Stage not found." };
    }

    const { error: scheduleError } = await supabase
      .from("event_schedules")
      .delete()
      .eq("stage_id", stageId)
      .eq("madrassa_id", madrassaId);

    if (scheduleError) {
      console.error("deleteStage schedule cleanup error:", scheduleError);
      return { success: false, message: "Failed to remove schedule entries for this stage." };
    }

    const { error: deleteError } = await supabase
      .from("stages")
      .delete()
      .eq("id", stageId)
      .eq("madrassa_id", madrassaId);

    if (deleteError) {
      console.error("deleteStage error:", deleteError);
      return { success: false, message: "Failed to delete stage." };
    }

    revalidatePath("/admin/events");
    return { success: true };
  } catch (error) {
    console.error("deleteStage error:", error);
    return { success: false, message: "Failed to delete stage." };
  }
}

// ── Schedule Event ────────────────────────────────────────────────────────

export async function scheduleEvent(
  eventId: string,
  stageId: string,
  startTime: string
): Promise<ActionResult<any>> {
  try {
    const session = await verifySession();
    if (!session) return { success: false, message: "Unauthorized" };
    const madrassaId = session.madrassa_id;

    const supabase = await createClient();

    // Explicitly verify both the event and the stage belong to this tenant
    // before writing. Previously this relied entirely on RLS to catch a
    // cross-tenant stageId/eventId — this adds an explicit application-level
    // check so a single misconfigured RLS policy (or an RLS-context failure)
    // can't turn into a foreign-tenant stage/event reference.
    const [{ data: event, error: eventCheckError }, { data: stage, error: stageCheckError }] =
      await Promise.all([
        supabase.from("events").select("id").eq("id", eventId).eq("madrassa_id", madrassaId).maybeSingle(),
        supabase.from("stages").select("id").eq("id", stageId).eq("madrassa_id", madrassaId).maybeSingle(),
      ]);

    if (eventCheckError || stageCheckError) {
      console.error("scheduleEvent ownership check error:", eventCheckError ?? stageCheckError);
      return { success: false, message: "Failed to schedule event." };
    }

    if (!event) {
      return { success: false, message: "Event not found." };
    }
    if (!stage) {
      return { success: false, message: "Stage not found." };
    }

    const { data, error } = await supabase
      .from("event_schedules")
      .upsert(
        {
          madrassa_id: madrassaId,
          event_id: eventId,
          stage_id: stageId,
          start_time: startTime,
          status: "upcoming",
        } as any,
        { onConflict: "event_id,madrassa_id" }
      )
      .select()
      .single();

    if (error) {
      console.error("scheduleEvent error:", error);
      return { success: false, message: "Failed to schedule event." };
    }

    revalidatePath("/admin/events");
    return { success: true, data };
  } catch (error) {
    console.error("scheduleEvent error:", error);
    return { success: false, message: "Failed to schedule event." };
  }
}