'use server';

import { sql } from '@/lib/db';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

interface ActionResult<T = undefined> {
  success: boolean;
  message?: string;
  data?: T;
}

interface JudgeSessionPayload {
  judgeId: string;
  madrassaId: string;
  subdomain: string;
}

const SESSION_COOKIE = 'judge_session';

function encodeSession(payload: JudgeSessionPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

export function decodeJudgeSession(value: string): JudgeSessionPayload | null {
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf-8'));
    if (parsed && parsed.judgeId && parsed.madrassaId && parsed.subdomain) {
      return parsed as JudgeSessionPayload;
    }
    return null;
  } catch {
    return null;
  }
}

export async function getCurrentJudgeSession(): Promise<JudgeSessionPayload | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  return decodeJudgeSession(raw);
}

export async function createJudgeAccount(
  madrassaId: string,
  phone: string,
  pin: string
): Promise<ActionResult<{ userId: string }>> {
  try {
    if (!/^\d{10,15}$/.test(phone)) {
      return { success: false, message: 'Invalid phone number format.' };
    }
    if (!/^\d{4,6}$/.test(pin)) {
      return { success: false, message: 'PIN must be 4-6 digits.' };
    }

    const existing = await sql`
      SELECT id FROM users
      WHERE madrassa_id = ${madrassaId} AND phone = ${phone} AND role = 'judge'
      LIMIT 1
    `;

    if (existing.length > 0) {
      return { success: false, message: 'A judge with this phone number already exists.' };
    }

    const pinHash = await bcrypt.hash(pin, 10);
    const userId = randomUUID();

    await sql`
      INSERT INTO users (id, madrassa_id, phone, pin_hash, role, created_at)
      VALUES (${userId}, ${madrassaId}, ${phone}, ${pinHash}, 'judge', now())
    `;

    return { success: true, data: { userId } };
  } catch (error) {
    console.error('createJudgeAccount error:', error);
    return { success: false, message: 'Failed to create judge account.' };
  }
}

export async function loginJudge(
  subdomain: string,
  phone: string,
  pin: string
): Promise<ActionResult<{ judgeId: string; madrassaId: string }>> {
  try {
    const rows = await sql`
      SELECT u.id AS judge_id, u.pin_hash, u.madrassa_id
      FROM users u
      JOIN madrassas m ON m.id = u.madrassa_id
      WHERE m.subdomain = ${subdomain}
        AND u.phone = ${phone}
        AND u.role = 'judge'
      LIMIT 1
    `;

    if (rows.length === 0) {
      return { success: false, message: 'Invalid phone number or PIN.' };
    }

    const row = rows[0] as { judge_id: string; pin_hash: string; madrassa_id: string };
    const validPin = await bcrypt.compare(pin, row.pin_hash);

    if (!validPin) {
      return { success: false, message: 'Invalid phone number or PIN.' };
    }

    const sessionValue = encodeSession({
      judgeId: row.judge_id,
      madrassaId: row.madrassa_id,
      subdomain,
    });

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, sessionValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 12,
    });

    return {
      success: true,
      data: { judgeId: row.judge_id, madrassaId: row.madrassa_id },
    };
  } catch (error) {
    console.error('loginJudge error:', error);
    return { success: false, message: 'Login failed. Please try again.' };
  }
}

export async function logoutJudge(): Promise<ActionResult> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  return { success: true };
}

export interface AssignedEvent {
  id: string;
  name: string;
  category: string | null;
  status: string;
  scheduledAt: string | null;
  rubrics: { key: string; label: string; maxScore: number }[];
}

export async function getAssignedEvents(judgeId: string): Promise<ActionResult<AssignedEvent[]>> {
  try {
    const rows = await sql`
      SELECT
        e.id,
        e.name,
        e.category,
        e.status,
        e.scheduled_at,
        e.rubrics
      FROM event_judges ej
      JOIN events e ON e.id = ej.event_id
      WHERE ej.judge_id = ${judgeId}
      ORDER BY e.scheduled_at ASC NULLS LAST, e.name ASC
    `;

    const events: AssignedEvent[] = rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      status: r.status,
      scheduledAt: r.scheduled_at ? new Date(r.scheduled_at).toISOString() : null,
      rubrics: Array.isArray(r.rubrics)
        ? r.rubrics
        : typeof r.rubrics === 'string'
        ? JSON.parse(r.rubrics)
        : [
            { key: 'rhythm', label: 'Rhythm', maxScore: 10 },
            { key: 'content', label: 'Content', maxScore: 10 },
            { key: 'expression', label: 'Expression', maxScore: 10 },
          ],
    }));

    return { success: true, data: events };
  } catch (error) {
    console.error('getAssignedEvents error:', error);
    return { success: false, message: 'Failed to load assigned events.' };
  }
}

export interface JudgeParticipant {
  participantId: string;
  participantType: 'individual' | 'squad';
  codeLetter: string;
  alreadyScored: boolean;
  existingScoreData: Record<string, number> | null;
  existingTotalScore: number | null;
}

export async function getEventParticipantsByCodeLetter(
  eventId: string,
  judgeId?: string
): Promise<ActionResult<JudgeParticipant[]>> {
  try {
    const individualRows = await sql`
      SELECT
        ep.id AS participant_id,
        ep.code_letter,
        s.score_data,
        s.total_score
      FROM event_participants ep
      LEFT JOIN scores s
        ON s.participant_id = ep.id
        AND s.participant_type = 'individual'
        AND s.event_id = ${eventId}
        AND s.judge_id = ${judgeId ?? null}
      WHERE ep.event_id = ${eventId} AND ep.participant_type = 'individual'
      ORDER BY ep.code_letter ASC
    `;

    const squadRows = await sql`
      SELECT
        es.id AS participant_id,
        es.code_letter,
        s.score_data,
        s.total_score
      FROM event_squads es
      LEFT JOIN scores s
        ON s.participant_id = es.id
        AND s.participant_type = 'squad'
        AND s.event_id = ${eventId}
        AND s.judge_id = ${judgeId ?? null}
      WHERE es.event_id = ${eventId}
      ORDER BY es.code_letter ASC
    `;

    const mapRow = (r: any, type: 'individual' | 'squad'): JudgeParticipant => ({
      participantId: r.participant_id,
      participantType: type,
      codeLetter: r.code_letter,
      alreadyScored: r.total_score !== null && r.total_score !== undefined,
      existingScoreData: r.score_data
        ? typeof r.score_data === 'string'
          ? JSON.parse(r.score_data)
          : r.score_data
        : null,
      existingTotalScore: r.total_score !== null && r.total_score !== undefined ? Number(r.total_score) : null,
    });

    const participants: JudgeParticipant[] = [
      ...individualRows.map((r: any) => mapRow(r, 'individual')),
      ...squadRows.map((r: any) => mapRow(r, 'squad')),
    ].sort((a, b) => a.codeLetter.localeCompare(b.codeLetter));

    return { success: true, data: participants };
  } catch (error) {
    console.error('getEventParticipantsByCodeLetter error:', error);
    return { success: false, message: 'Failed to load participants.' };
  }
}

export async function submitJudgeScore(
  madrassaId: string,
  eventId: string,
  judgeId: string,
  participantType: 'individual' | 'squad',
  participantId: string,
  scoreDataJson: Record<string, number>,
  totalScore: number
): Promise<ActionResult> {
  try {
    if (totalScore < 0) {
      return { success: false, message: 'Total score cannot be negative.' };
    }

    const existing = await sql`
      SELECT id FROM scores
      WHERE madrassa_id = ${madrassaId}
        AND event_id = ${eventId}
        AND judge_id = ${judgeId}
        AND participant_type = ${participantType}
        AND participant_id = ${participantId}
      LIMIT 1
    `;

    const scoreDataStr = JSON.stringify(scoreDataJson);

    if (existing.length > 0) {
      await sql`
        UPDATE scores
        SET score_data = ${scoreDataStr}::jsonb,
            total_score = ${totalScore},
            updated_at = now()
        WHERE id = ${existing[0].id}
      `;
    } else {
      const scoreId = randomUUID();
      await sql`
        INSERT INTO scores (
          id, madrassa_id, event_id, judge_id,
          participant_type, participant_id,
          score_data, total_score, created_at, updated_at
        )
        VALUES (
          ${scoreId}, ${madrassaId}, ${eventId}, ${judgeId},
          ${participantType}, ${participantId},
          ${scoreDataStr}::jsonb, ${totalScore}, now(), now()
        )
      `;
    }

    return { success: true };
  } catch (error) {
    console.error('submitJudgeScore error:', error);
    return { success: false, message: 'Failed to submit score.' };
  }
}

export interface AggregatedParticipantScore {
  participantId: string;
  participantType: 'individual' | 'squad';
  codeLetter: string;
  judgeCount: number;
  averageScore: number;
  scores: { judgeId: string; totalScore: number }[];
}

export async function calculateMultiJudgeAverage(
  madrassaId: string,
  eventId: string
): Promise<ActionResult<AggregatedParticipantScore[]>> {
  try {
    const individualRows = await sql`
      SELECT
        ep.id AS participant_id,
        ep.code_letter,
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

    const grouped = new Map
      string,
      { codeLetter: string; participantType: 'individual' | 'squad'; scores: { judgeId: string; totalScore: number }[] }
    >();

    const consume = (rows: any[], type: 'individual' | 'squad') => {
      for (const r of rows) {
        const key = `${type}:${r.participant_id}`;
        if (!grouped.has(key)) {
          grouped.set(key, { codeLetter: r.code_letter, participantType: type, scores: [] });
        }
        if (r.judge_id !== null && r.total_score !== null && r.total_score !== undefined) {
          grouped.get(key)!.scores.push({ judgeId: r.judge_id, totalScore: Number(r.total_score) });
        }
      }
    };

    consume(individualRows, 'individual');
    consume(squadRows, 'squad');

    const results: AggregatedParticipantScore[] = Array.from(grouped.entries()).map(([key, value]) => {
      const participantId = key.split(':')[1];
      const judgeCount = value.scores.length;
      const averageScore =
        judgeCount > 0
          ? Number((value.scores.reduce((sum, s) => sum + s.totalScore, 0) / judgeCount).toFixed(2))
          : 0;

      return {
        participantId,
        participantType: value.participantType,
        codeLetter: value.codeLetter,
        judgeCount,
        averageScore,
        scores: value.scores,
      };
    });

    results.sort((a, b) => b.averageScore - a.averageScore);

    return { success: true, data: results };
  } catch (error) {
    console.error('calculateMultiJudgeAverage error:', error);
    return { success: false, message: 'Failed to calculate averages.' };
  }
}
