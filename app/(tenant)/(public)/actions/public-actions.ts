'use server';

import { sql } from '@/lib/db';

interface ActionResult<T = undefined> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface ScheduleItem {
  eventId: string;
  eventName: string;
  category: string | null;
  stageName: string | null;
  startTime: string;
  endTime: string | null;
  status: string;
}

export async function getPublicSchedule(madrassaId: string): Promise<ActionResult<ScheduleItem[]>> {
  try {
    const rows = await sql`
      SELECT
        e.id AS event_id,
        e.name AS event_name,
        e.category,
        e.status,
        st.name AS stage_name,
        es.start_time,
        es.end_time
      FROM event_schedules es
      JOIN events e ON e.id = es.event_id
      LEFT JOIN stages st ON st.id = es.stage_id
      WHERE e.madrassa_id = ${madrassaId}
      ORDER BY es.start_time ASC
    `;

    const items: ScheduleItem[] = rows.map((r: any) => ({
      eventId: r.event_id,
      eventName: r.event_name,
      category: r.category,
      stageName: r.stage_name,
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

export async function getPublishedResults(
  madrassaId: string
): Promise<ActionResult<PublishedEventResult[]>> {
  try {
    const rows = await sql`
      SELECT
        r.event_id,
        e.name AS event_name,
        e.category,
        r.published_at,
        r.participant_id,
        r.participant_type,
        r.code_letter,
        r.final_rank,
        r.points_awarded,
        st.name AS student_name,
        sg.name AS subgroup_name
      FROM results r
      JOIN events e ON e.id = r.event_id
      LEFT JOIN students st
        ON st.id = r.participant_id AND r.participant_type = 'individual'
      LEFT JOIN event_subgroups sg
        ON sg.id = r.participant_id AND r.participant_type = 'squad'
      WHERE r.madrassa_id = ${madrassaId} AND r.is_published = true
      ORDER BY e.name ASC, r.final_rank ASC
    `;

    const grouped = new Map<string, PublishedEventResult>();

    for (const row of rows as any[]) {
      if (!grouped.has(row.event_id)) {
        grouped.set(row.event_id, {
          eventId: row.event_id,
          eventName: row.event_name,
          category: row.category,
          publishedAt: row.published_at ? new Date(row.published_at).toISOString() : null,
          winners: [],
        });
      }

      if (row.final_rank <= 3) {
        grouped.get(row.event_id)!.winners.push({
          participantId: row.participant_id,
          participantType: row.participant_type,
          codeLetter: row.code_letter,
          displayName: row.participant_type === 'individual' ? row.student_name : row.subgroup_name,
          finalRank: Number(row.final_rank),
          pointsAwarded: Number(row.points_awarded),
        });
      }
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

export interface TeamLeaderboardEntry {
  teamId: string;
  teamName: string;
  totalPoints: number;
  rank: number;
}

export async function getTeamLeaderboard(
  madrassaId: string
): Promise<ActionResult<TeamLeaderboardEntry[]>> {
  try {
    const rows = await sql`
      SELECT
        t.id AS team_id,
        t.name AS team_name,
        COALESCE(SUM(r.points_awarded), 0) AS total_points
      FROM teams t
      LEFT JOIN results r
        ON r.team_id = t.id
        AND r.madrassa_id = ${madrassaId}
        AND r.is_published = true
      WHERE t.madrassa_id = ${madrassaId}
      GROUP BY t.id, t.name
      ORDER BY total_points DESC, t.name ASC
    `;

    let rank = 0;
    let prevPoints: number | null = null;

    const entries: TeamLeaderboardEntry[] = rows.map((r: any, idx: number) => {
      const totalPoints = Number(r.total_points);
      if (prevPoints === null || totalPoints !== prevPoints) {
        rank = idx + 1;
        prevPoints = totalPoints;
      }
      return {
        teamId: r.team_id,
        teamName: r.team_name,
        totalPoints,
        rank,
      };
    });

    return { success: true, data: entries };
  } catch (error) {
    console.error('getTeamLeaderboard error:', error);
    return { success: false, message: 'Failed to load leaderboard.' };
  }
}
