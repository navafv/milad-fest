import { createClient } from "@/lib/supabase/server";

interface ActionResult<T = undefined> {
  success: boolean;
  message?: string;
  data?: T;
}

// ── Schedule ──────────────────────────────────────────────────────────────

export interface ScheduleItem {
  eventId: string;
  eventName: string;
  category: string | null;
  stageName: string | null;
  startTime: string;
  endTime: string | null;
  status: string;
}

interface ScheduleRow {
  start_time: string;
  end_time: string | null;
  status: string;
  events: {
    id: string;
    name: string;
    categories: { name: string } | null;
  } | null;
  stages: { name: string } | null;
}

export async function getPublicSchedule(madrassaId: string): Promise<ActionResult<ScheduleItem[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('event_schedules')
      .select(`
        start_time,
        end_time,
        status,
        events!inner (
          id,
          name,
          madrassa_id,
          categories (
            name
          )
        ),
        stages (
          name
        )
      `)
      .eq('madrassa_id', madrassaId)
      .eq('events.madrassa_id', madrassaId)
      .order('start_time', { ascending: true });

    if (error) throw error;

    const rows = (data as unknown as ScheduleRow[]) || [];

    const items: ScheduleItem[] = rows
      .filter((r) => r.events !== null)
      .map((r) => ({
        eventId: r.events!.id,
        eventName: r.events!.name,
        category: r.events!.categories?.name || null,
        stageName: r.stages?.name || null,
        startTime: new Date(r.start_time).toISOString(),
        endTime: r.end_time ? new Date(r.end_time).toISOString() : null,
        status: r.status,
      }));

    return { success: true, data: items };
  } catch (error) {
    console.error('getPublicSchedule error:', error);
    return { success: false, message: 'Failed to load schedule.' };
  }
}

// ── Published Results ────────────────────────────────────────────────────

export interface WinnerEntry {
  participantId: string;
  participantType: 'individual' | 'squad';
  codeLetter: string;
  displayName: string | null;
  finalRank: number;
  pointsAwarded: number;
}

export interface PublishedEventResult {
  eventId: string;
  eventName: string;
  category: string | null;
  publishedAt: string | null;
  winners: WinnerEntry[];
}

interface ResultRow {
  event_id: string;
  published_at: string | null;
  participant_id: string;
  participant_type: 'individual' | 'squad';
  code_letter: string;
  final_rank: number;
  points_awarded: number;
  events: {
    name: string;
    categories: { name: string } | null;
  } | null;
  students: { name: string } | null;
  event_subgroups: { team_id: string | null } | null;
}

export async function getPublishedResults(
  madrassaId: string
): Promise<ActionResult<PublishedEventResult[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('results')
      .select(`
        event_id,
        published_at,
        participant_id,
        participant_type,
        code_letter,
        final_rank,
        points_awarded,
        events (
          name,
          categories (
            name
          )
        ),
        students (
          name
        ),
        event_subgroups (
          team_id
        )
      `)
      .eq('madrassa_id', madrassaId)
      .eq('is_published', true)
      .lte('final_rank', 3)
      .order('final_rank', { ascending: true });

    if (error) throw error;

    const rows = (data as unknown as ResultRow[]) || [];

    const grouped = new Map<string, PublishedEventResult>();

    for (const row of rows) {
      if (!grouped.has(row.event_id)) {
        grouped.set(row.event_id, {
          eventId: row.event_id,
          eventName: row.events?.name || 'Unknown Event',
          category: row.events?.categories?.name || null,
          publishedAt: row.published_at ? new Date(row.published_at).toISOString() : null,
          winners: [],
        });
      }

      const displayName =
        row.participant_type === 'individual'
          ? row.students?.name ?? null
          : `Squad ${row.code_letter}`;

      grouped.get(row.event_id)!.winners.push({
        participantId: row.participant_id,
        participantType: row.participant_type,
        codeLetter: row.code_letter,
        displayName,
        finalRank: Number(row.final_rank),
        pointsAwarded: Number(row.points_awarded),
      });
    }

    const results = Array.from(grouped.values()).map((event) => ({
      ...event,
      winners: event.winners.sort((a, b) => a.finalRank - b.finalRank),
    }));

    results.sort((a, b) => a.eventName.localeCompare(b.eventName));

    return { success: true, data: results };
  } catch (error) {
    console.error('getPublishedResults error:', error);
    return { success: false, message: 'Failed to load published results.' };
  }
}

// ── Team Leaderboard ─────────────────────────────────────────────────────

export interface TeamLeaderboardEntry {
  teamId: string;
  teamName: string;
  totalPoints: number;
  rank: number;
}

interface TeamRow {
  id: string;
  name: string;
}

interface TeamPointsRow {
  team_id: string;
  points_awarded: number;
}

export async function getTeamLeaderboard(
  madrassaId: string
): Promise<ActionResult<TeamLeaderboardEntry[]>> {
  try {
    const supabase = await createClient();

    const [{ data: teamsData, error: teamsError }, { data: resultsData, error: resultsError }] =
      await Promise.all([
        supabase.from('teams').select('id, name').eq('madrassa_id', madrassaId),
        supabase
          .from('results')
          .select('team_id, points_awarded')
          .eq('madrassa_id', madrassaId)
          .eq('is_published', true)
          .not('team_id', 'is', null),
      ]);

    if (teamsError) throw teamsError;
    if (resultsError) throw resultsError;

    const teams = (teamsData as TeamRow[]) || [];
    const results = (resultsData as TeamPointsRow[]) || [];

    const teamPoints = new Map<string, number>();
    for (const row of results) {
      const current = teamPoints.get(row.team_id) || 0;
      teamPoints.set(row.team_id, current + (Number(row.points_awarded) || 0));
    }

    const scoredTeams = teams
      .map((t) => ({
        teamId: t.id,
        teamName: t.name,
        totalPoints: teamPoints.get(t.id) || 0,
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints || a.teamName.localeCompare(b.teamName));

    let rank = 0;
    let prevPoints: number | null = null;

    const entries: TeamLeaderboardEntry[] = scoredTeams.map((team, idx) => {
      if (prevPoints === null || team.totalPoints !== prevPoints) {
        rank = idx + 1;
        prevPoints = team.totalPoints;
      }
      return {
        ...team,
        rank,
      };
    });

    return { success: true, data: entries };
  } catch (error) {
    console.error('getTeamLeaderboard error:', error);
    return { success: false, message: 'Failed to load leaderboard.' };
  }
}
