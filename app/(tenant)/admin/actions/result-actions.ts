'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { requireAdminSession } from '@/lib/utils/tenant-auth';

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
    await requireAdminSession(madrassaId);

    const supabase = await createClient();

    // Fetch all related data in parallel using Supabase
    const [
      { data: individualRows },
      { data: squadRows },
      { data: scores },
      { data: overrides }
    ] = await Promise.all([
      supabase.from('event_participants').select('id, code_letter').eq('event_id', eventId).eq('madrassa_id', madrassaId).eq('participant_type', 'individual'),
      supabase.from('event_squads').select('id, code_letter, team_id').eq('event_id', eventId).eq('madrassa_id', madrassaId),
      supabase.from('scores').select('participant_id, participant_type, judge_id, total_score').eq('event_id', eventId).eq('madrassa_id', madrassaId),
      supabase.from('rank_overrides').select('participant_id, participant_type, override_rank').eq('event_id', eventId).eq('madrassa_id', madrassaId)
    ]);

    const overrideMap = new Map<string, number>();
    for (const r of (overrides as any[]) || []) {
      overrideMap.set(`${r.participant_type}:${r.participant_id}`, Number(r.override_rank));
    }

    const grouped = new Map<
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
        const key = `${type}:${r.id}`;
        if (!grouped.has(key)) {
          grouped.set(key, {
            participantId: r.id,
            participantType: type,
            codeLetter: r.code_letter,
            teamId: r.team_id || null,
            scores: [],
          });
        }
      }
    };

    consume((individualRows as any[]) || [], 'individual');
    consume((squadRows as any[]) || [], 'squad');

    // Attach scores
    for (const s of (scores as any[]) || []) {
      const key = `${s.participant_type}:${s.participant_id}`;
      if (grouped.has(key) && s.total_score !== null) {
        grouped.get(key)!.scores.push(Number(s.total_score));
      }
    }

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
    await requireAdminSession(madrassaId);

    const supabase = await createClient();

    for (const o of rankOverrides) {
      if (!Number.isInteger(o.rank) || o.rank < 1) {
        return { success: false, message: `Invalid rank for participant ${o.participantId}.` };
      }
    }

    const upserts = rankOverrides.map(o => ({
      madrassa_id: madrassaId,
      event_id: eventId,
      participant_id: o.participantId,
      participant_type: o.participantType,
      override_rank: o.rank,
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase.from('rank_overrides').upsert(upserts as any, {
      onConflict: 'madrassa_id,event_id,participant_id'
    });

    if (error) throw error;

    revalidatePath('/admin/results');
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
    await requireAdminSession(madrassaId);
    const supabase = await createClient();

    // 1. THE LOCK: Atomically flip status to "publishing" and fetch event rules at the same time.
    // By restricting `.in('status', ['live', 'completed'])`, we prevent a double-publish race condition.
    const { data: rawEventRow, error: lockError } = await supabase
      .from('events')
      .update({ status: 'publishing' } as any)
      .eq('id', eventId)
      .eq('madrassa_id', madrassaId)
      .in('status', ['live', 'completed']) 
      .select('id, participant_mode, point_rules')
      .single();

    if (lockError || !rawEventRow) {
      return { success: false, message: 'Event is not ready to publish or is already being published.' };
    }

    const eventRow = rawEventRow as any;

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

    // 2. Read the scoreboard data safely now that the event is locked
    const scoreboardResult = await getEventScoreboard(madrassaId, eventId);
    if (!scoreboardResult.success || !scoreboardResult.data) {
      // Rollback: if scoreboard fails, revert status back to completed
      await supabase.from('events').update({ status: 'completed' } as any).eq('id', eventId);
      return { success: false, message: scoreboardResult.message ?? 'Failed to compute scoreboard.' };
    }

    // 3. Compute final ranks and map to upsert format
    const finalized = scoreboardResult.data.map((entry) => ({
      ...entry,
      finalRank: entry.overrideRank ?? entry.autoRank,
    }));

    const resultsToUpsert = finalized.map(entry => {
      const rulesForType = entry.participantType === 'squad' ? pointRules.group : pointRules.individual;
      const matchingRule = rulesForType.find((r) => r.rank === entry.finalRank);
      const points = matchingRule ? matchingRule.points : 0;
      const teamId = entry.participantType === 'squad' ? entry.teamId : null;

      return {
        madrassa_id: madrassaId,
        event_id: eventId,
        participant_id: entry.participantId,
        participant_type: entry.participantType,
        code_letter: entry.codeLetter,
        average_score: entry.averageScore,
        final_rank: entry.finalRank,
        points_awarded: points,
        team_id: teamId,
        is_published: true,
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    });

    // 4. Safely Upsert the Results
    if (resultsToUpsert.length > 0) {
      const { error: upsertError } = await supabase.from('results').upsert(resultsToUpsert as any, {
        onConflict: 'madrassa_id,event_id,participant_id'
      });

      if (upsertError) {
        // Rollback on failure
        await supabase.from('events').update({ status: 'completed' } as any).eq('id', eventId);
        throw upsertError;
      }
    }

    // 5. Finally, mark it fully published!
    await (supabase.from('events') as any)
      .update({ status: 'published', updated_at: new Date().toISOString() })
      .eq('id', eventId)
      .eq('madrassa_id', madrassaId);

    // Revalidate caches (Audit recommendation: clear public results cache too)
    revalidatePath('/admin/results');
    revalidatePath('/results'); 

    return { success: true, data: { publishedCount: resultsToUpsert.length } };
  } catch (error) {
    console.error('publishEventResults error:', error);
    
    // Best-effort rollback just in case an unexpected crash happens
    try {
      const supabase = await createClient();
      await supabase.from('events').update({ status: 'completed' } as any).eq('id', eventId);
    } catch (_) {}
    
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
    await requireAdminSession(madrassaId);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('events')
      .select('id, name, category, status')
      .eq('madrassa_id', madrassaId)
      .order('scheduled_at', { ascending: true, nullsFirst: false })
      .order('name', { ascending: true });

    if (error) throw error;

    return { success: true, data: (data as any[]) as EventOption[] };
  } catch (error) {
    console.error('getEventsForAudit error:', error);
    return { success: false, message: 'Failed to load events.' };
  }
}
