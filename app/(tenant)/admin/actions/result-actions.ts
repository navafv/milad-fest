'use server';

import { sql } from '@/lib/db';
import { randomUUID } from 'crypto';

interface ActionResult<T = undefined> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface ScoreboardEntry {
  participantId: string;
  participantType: 'individual' | 'squad';
  codeLetter: string;
  teamId: string | null;
  judgeCount: number;
  averageScore: number;
  autoRank: number;
  isTied: boolean;
  overrideRank: number | null;
}

export async function getEventScoreboard(
  madrassaId: string,
  eventId: string
): Promise<ActionResult<ScoreboardEntry[]>> {
  try {
    const individualRows = await sql`
      SELECT
        ep.id AS participant_id,
        ep.code_letter,
        NULL::text AS team_id,
        s.judge_id,
        s.total_score
      FROM event_participants ep
      LEFT JOIN scores s
        ON s.participant_id = ep.id
        AND s.participant_type = 'individual'
        AND s.event_id = ${eventId}
        AND s.madrassa_id = ${madrassaId}
      WHERE ep.event_id = ${eventId} AND ep.participant_type = 'individual'
    `;

    const squadRows = await sql`
      SELECT
        es.id AS participant_id,
        es.code_letter,
        es.team_id::text AS team_id,
        s.judge_id,
        s.total_score
      FROM event_squads es
      LEFT JOIN scores s
        ON s.participant_id = es.id
        AND s.participant_type = 'squad'
        AND s.event_id = ${eventId}
        AND s.madrassa_id = ${madrassaId}
      WHERE es.event_id = ${eventId}
    `;

    const overrideRows = await sql`
      SELECT participant_id, participant_type, override_rank
      FROM rank_overrides
      WHERE madrassa_id = ${madrassaId} AND event_id = ${eventId}
    `;

    const overrideMap = new Map<string, number>();
    for (const r of overrideRows as any[]) {
      overrideMap.set(`${r.participant_type}:${r.participant_id}`, Number(r.override_rank));
    }

    const grouped = new Map
      string,
      {
        participantId: string;
        participantType: 'individual' | 'squad';
        codeLetter: string;
        teamId: string | null;
        scores: number[];
      }
    >();

    const consume = (rows: any[], type: 'individual' | 'squad') => {
      for (const r of rows) {
        const key = `${type}:${r.participant_id}`;
        if (!grouped.has(key)) {
          grouped.set(key, {
            participantId: r.participant_id,
            participantType: type,
            codeLetter: r.code_letter,
            teamId: r.team_id,
            scores: [],
          });
        }
        if (r.judge_id !== null && r.total_score !== null && r.total_score !== undefined) {
          grouped.get(key)!.scores.push(Number(r.total_score));
        }
      }
    };

    consume(individualRows, 'individual');
    consume(squadRows, 'squad');

    const baseEntries = Array.from(grouped.values()).map((v) => {
      const judgeCount = v.scores.length;
      const averageScore =
        judgeCount > 0
          ? Number((v.scores.reduce((sum, s) => sum + s, 0) / judgeCount).toFixed(2))
          : 0;
      return {
        participantId: v.participantId,
        participantType: v.participantType,
        codeLetter: v.codeLetter,
        teamId: v.teamId,
        judgeCount,
        averageScore,
      };
    });

    baseEntries.sort((a, b) => b.averageScore - a.averageScore);

    let rank = 0;
    let prevScore: number | null = null;
    let skip = 0;
    const scoreCounts = new Map<number, number>();
    for (const e of baseEntries) {
      scoreCounts.set(e.averageScore, (scoreCounts.get(e.averageScore) ?? 0) + 1);
    }

    const entries: ScoreboardEntry[] = baseEntries.map((e, idx) => {
      if (prevScore === null || e.averageScore !== prevScore) {
        rank = idx + 1;
        prevScore = e.averageScore;
      }
      const key = `${e.participantType}:${e.participantId}`;
      return {
        ...e,
        autoRank: rank,
        isTied: (scoreCounts.get(e.averageScore) ?? 0) > 1,
        overrideRank: overrideMap.get(key) ?? null,
      };
    });

    return { success: true, data: entries };
  } catch (error) {
    console.error('getEventScoreboard error:', error);
    return { success: false, message: 'Failed to load scoreboard.' };
  }
}

export interface RankOverrideInput {
  participantId: string;
  participantType: 'individual' | 'squad';
  rank: number;
}

export async function overrideRanksAndTieBreakers(
  madrassaId: string,
  eventId: string,
  rankOverrides: RankOverrideInput[]
): Promise<ActionResult> {
  try {
    for (const o of rankOverrides) {
      if (!Number.isInteger(o.rank) || o.rank < 1) {
        return { success: false, message: `Invalid rank for participant ${o.participantId}.` };
      }
    }

    for (const o of rankOverrides) {
      const existing = await sql`
        SELECT id FROM rank_overrides
        WHERE madrassa_id = ${madrassaId}
          AND event_id = ${eventId}
          AND participant_id = ${o.participantId}
          AND participant_type = ${o.participantType}
        LIMIT 1
      `;

      if (existing.length > 0) {
        await sql`
          UPDATE rank_overrides
          SET override_rank = ${o.rank}, updated_at = now()
          WHERE id = ${existing[0].id}
        `;
      } else {
        const id = randomUUID();
        await sql`
          INSERT INTO rank_overrides (
            id, madrassa_id, event_id, participant_id, participant_type, override_rank, created_at, updated_at
          )
          VALUES (
            ${id}, ${madrassaId}, ${eventId}, ${o.participantId}, ${o.participantType}, ${o.rank}, now(), now()
          )
        `;
      }
    }

    return { success: true };
  } catch (error) {
    console.error('overrideRanksAndTieBreakers error:', error);
    return { success: false, message: 'Failed to save rank overrides.' };
  }
}

interface PointRule {
  rank: number;
  points: number;
}

interface EventPointRules {
  individual: PointRule[];
  group: PointRule[];
}

export async function publishEventResults(
  madrassaId: string,
  eventId: string
): Promise<ActionResult<{ publishedCount: number }>> {
  try {
    const eventRows = await sql`
      SELECT id, participant_mode, point_rules
      FROM events
      WHERE id = ${eventId} AND madrassa_id = ${madrassaId}
      LIMIT 1
    `;

    if (eventRows.length === 0) {
      return { success: false, message: 'Event not found.' };
    }

    const eventRow = eventRows[0] as any;
    const pointRules: EventPointRules = eventRow.point_rules
      ? typeof eventRow.point_rules === 'string'
        ? JSON.parse(eventRow.point_rules)
        : eventRow.point_rules
      : {
          individual: [
            { rank: 1, points: 5 },
            { rank: 2, points: 3 },
            { rank: 3, points: 1 },
          ],
          group: [
            { rank: 1, points: 10 },
            { rank: 2, points: 6 },
            { rank: 3, points: 2 },
          ],
        };

    const scoreboardResult = await getEventScoreboard(madrassaId, eventId);
    if (!scoreboardResult.success || !scoreboardResult.data) {
      return { success: false, message: scoreboardResult.message ?? 'Failed to compute scoreboard.' };
    }

    const finalized = scoreboardResult.data.map((entry) => ({
      ...entry,
      finalRank: entry.overrideRank ?? entry.autoRank,
    }));

    let publishedCount = 0;

    for (const entry of finalized) {
      const rulesForType = entry.participantType === 'squad' ? pointRules.group : pointRules.individual;
      const matchingRule = rulesForType.find((r) => r.rank === entry.finalRank);
      const points = matchingRule ? matchingRule.points : 0;
      const teamId = entry.participantType === 'squad' ? entry.teamId : null;

      const existing = await sql`
        SELECT id FROM results
        WHERE madrassa_id = ${madrassaId}
          AND event_id = ${eventId}
          AND participant_id = ${entry.participantId}
          AND participant_type = ${entry.participantType}
        LIMIT 1
      `;

      if (existing.length > 0) {
        await sql`
          UPDATE results
          SET
            average_score = ${entry.averageScore},
            final_rank = ${entry.finalRank},
            points_awarded = ${points},
            team_id = ${teamId},
            is_published = true,
            published_at = now(),
            updated_at = now()
          WHERE id = ${existing[0].id}
        `;
      } else {
        const id = randomUUID();
        await sql`
          INSERT INTO results (
            id, madrassa_id, event_id, participant_id, participant_type,
            code_letter, average_score, final_rank, points_awarded, team_id,
            is_published, published_at, created_at, updated_at
          )
          VALUES (
            ${id}, ${madrassaId}, ${eventId}, ${entry.participantId}, ${entry.participantType},
            ${entry.codeLetter}, ${entry.averageScore}, ${entry.finalRank}, ${points}, ${teamId},
            true, now(), now(), now()
          )
        `;
      }

      publishedCount += 1;
    }

    await sql`
      UPDATE events
      SET status = 'published', updated_at = now()
      WHERE id = ${eventId} AND madrassa_id = ${madrassaId}
    `;

    return { success: true, data: { publishedCount } };
  } catch (error) {
    console.error('publishEventResults error:', error);
    return { success: false, message: 'Failed to publish results.' };
  }
}

export interface EventOption {
  id: string;
  name: string;
  category: string | null;
  status: string;
}

export async function getEventsForAudit(madrassaId: string): Promise<ActionResult<EventOption[]>> {
  try {
    const rows = await sql`
      SELECT id, name, category, status
      FROM events
      WHERE madrassa_id = ${madrassaId}
      ORDER BY scheduled_at ASC NULLS LAST, name ASC
    `;

    const events: EventOption[] = rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      status: r.status,
    }));

    return { success: true, data: events };
  } catch (error) {
    console.error('getEventsForAudit error:', error);
    return { success: false, message: 'Failed to load events.' };
  }
}
