'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { requireAdminSession } from '@/lib/utils/tenant-auth';

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

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set.');
}

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

async function encodeSession(payload: JudgeSessionPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(JWT_SECRET);
}

export async function decodeJudgeSession(value: string): Promise<JudgeSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(value, JWT_SECRET);
    if (
      payload &&
      typeof payload.judgeId === 'string' &&
      typeof payload.madrassaId === 'string' &&
      typeof payload.subdomain === 'string'
    ) {
      return {
        judgeId: payload.judgeId,
        madrassaId: payload.madrassaId,
        subdomain: payload.subdomain,
      };
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
  return await decodeJudgeSession(raw);
}

export async function createJudgeAccount(
  madrassaId: string,
  phone: string,
  pin: string
): Promise<ActionResult<{ userId: string }>> {
  try {
    await requireAdminSession(madrassaId);

    if (!/^\d{10,15}$/.test(phone)) {
      return { success: false, message: 'Invalid phone number format.' };
    }
    if (!/^\d{4,6}$/.test(pin)) {
      return { success: false, message: 'PIN must be 4-6 digits.' };
    }

    const supabase = await createClient();

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('madrassa_id', madrassaId)
      .eq('phone', phone)
      .eq('role', 'judge')
      .single();

    if (existing) {
      return { success: false, message: 'A judge with this phone number already exists.' };
    }

    const pinHash = await bcrypt.hash(pin, 10);
    const userId = randomUUID();

    const { error } = await supabase.from('users').insert({
      id: userId,
      madrassa_id: madrassaId,
      phone,
      pin_hash: pinHash,
      role: 'judge',
      created_at: new Date().toISOString()
    } as any);

    if (error) throw error;

    return { success: true, data: { userId } };
  } catch (error) {
    console.error('createJudgeAccount error:', error);
    if (error instanceof Error && (error as any).status) {
      return { success: false, message: error.message };
    }
    return { success: false, message: 'Failed to create judge account.' };
  }
}

export async function loginJudge(
  subdomain: string,
  phone: string,
  pin: string
): Promise<ActionResult<{ judgeId: string; madrassaId: string }>> {
  try {
    const supabase = await createClient();

    const { data: madrassa } = await supabase
      .from('madrassas')
      .select('id')
      .eq('subdomain', subdomain)
      .single();

    if (!madrassa) {
      return { success: false, message: 'Invalid domain.' };
    }

    const { data: userRaw } = await supabase
      .from('users')
      .select('id, pin_hash, madrassa_id')
      .eq('phone', phone)
      .eq('role', 'judge')
      .eq('madrassa_id', (madrassa as any).id)
      .single();

    const user = userRaw as any;

    if (!user) {
      return { success: false, message: 'Invalid phone number or PIN.' };
    }

    const validPin = await bcrypt.compare(pin, user.pin_hash);
    if (!validPin) {
      return { success: false, message: 'Invalid phone number or PIN.' };
    }

    const sessionValue = await encodeSession({
      judgeId: user.id,
      madrassaId: user.madrassa_id,
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
      data: { judgeId: user.id, madrassaId: user.madrassa_id },
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
    const session = await getCurrentJudgeSession();
    if (!session) {
      return { success: false, message: 'Unauthorized: no active judge session.' };
    }
    if (session.judgeId !== judgeId) {
      return { success: false, message: 'Forbidden: judge mismatch.' };
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('event_judges')
      .select(`
        events (
          id, name, category, status, scheduled_at, rubrics
        )
      `)
      .eq('judge_id', judgeId);

    if (error) throw error;

    const events: AssignedEvent[] = ((data as any[]) || []).map((r: any) => {
      const e = r.events;
      return {
        id: e.id,
        name: e.name,
        category: e.category,
        status: e.status,
        scheduledAt: e.scheduled_at ? new Date(e.scheduled_at).toISOString() : null,
        rubrics: Array.isArray(e.rubrics)
          ? e.rubrics
          : typeof e.rubrics === 'string'
          ? JSON.parse(e.rubrics)
          : [
              { key: 'rhythm', label: 'Rhythm', maxScore: 10 },
              { key: 'content', label: 'Content', maxScore: 10 },
              { key: 'expression', label: 'Expression', maxScore: 10 },
            ],
      };
    });

    // Sort by scheduledAt then name
    events.sort((a, b) => {
      if (a.scheduledAt === b.scheduledAt) return a.name.localeCompare(b.name);
      if (!a.scheduledAt) return 1;
      if (!b.scheduledAt) return -1;
      return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
    });

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
  madrassaId: string,
  eventId: string,
  judgeId?: string
): Promise<ActionResult<JudgeParticipant[]>> {
  try {
    const supabase = await createClient();

    const [
      { data: individualRows },
      { data: squadRows },
      { data: scores }
    ] = await Promise.all([
      supabase
        .from('event_participants')
        .select('id, code_letter')
        .eq('event_id', eventId)
        .eq('madrassa_id', madrassaId)
        .eq('participant_type', 'individual'),
      supabase
        .from('event_squads')
        .select('id, code_letter')
        .eq('event_id', eventId)
        .eq('madrassa_id', madrassaId),
      judgeId
        ? supabase
            .from('scores')
            .select('participant_id, score_data, total_score')
            .eq('event_id', eventId)
            .eq('madrassa_id', madrassaId)
            .eq('judge_id', judgeId)
        : Promise.resolve({ data: [] })
    ]);

    const scoreMap = new Map<string, any>();
    for (const s of (scores as any[]) || []) {
      scoreMap.set(s.participant_id, s);
    }

    const mapRow = (r: any, type: 'individual' | 'squad'): JudgeParticipant => {
      const s = scoreMap.get(r.id);
      return {
        participantId: r.id,
        participantType: type,
        codeLetter: r.code_letter,
        alreadyScored: !!(s && s.total_score !== null),
        existingScoreData: s?.score_data
          ? typeof s.score_data === 'string'
            ? JSON.parse(s.score_data)
            : s.score_data
          : null,
        existingTotalScore: s?.total_score !== null && s?.total_score !== undefined ? Number(s.total_score) : null,
      };
    };

    const participants: JudgeParticipant[] = [
      ...((individualRows as any[]) || []).map((r: any) => mapRow(r, 'individual')),
      ...((squadRows as any[]) || []).map((r: any) => mapRow(r, 'squad')),
    ].sort((a, b) => a.codeLetter.localeCompare(b.codeLetter));

    return { success: true, data: participants };
  } catch (error) {
    console.error('getEventParticipantsByCodeLetter error:', error);
    return { success: false, message: 'Failed to load participants.' };
  }
}

export async function submitJudgeScore(
  eventId: string,
  participantType: 'individual' | 'squad',
  participantId: string,
  scoreDataJson: Record<string, number>,
  totalScore: number
): Promise<ActionResult> {
  try {
    const session = await getCurrentJudgeSession();
    if (!session) {
      return { success: false, message: 'Unauthorized: no active judge session.' };
    }

    if (totalScore < 0) {
      return { success: false, message: 'Total score cannot be negative.' };
    }

    const supabase = await createClient();

    const upsertData = {
      madrassa_id: session.madrassaId,
      event_id: eventId,
      judge_id: session.judgeId,
      participant_type: participantType,
      participant_id: participantId,
      score_data: scoreDataJson,
      total_score: totalScore,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from('scores').upsert(upsertData as any, {
      onConflict: 'event_id,judge_id,participant_id'
    });

    if (error) throw error;

    revalidatePath('/judge/dashboard');

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
    const supabase = await createClient();

    const [
      { data: individualRows },
      { data: squadRows },
      { data: scores }
    ] = await Promise.all([
      supabase
        .from('event_participants')
        .select('id, code_letter')
        .eq('event_id', eventId)
        .eq('madrassa_id', madrassaId)
        .eq('participant_type', 'individual'),
      supabase
        .from('event_squads')
        .select('id, code_letter')
        .eq('event_id', eventId)
        .eq('madrassa_id', madrassaId),
      supabase
        .from('scores')
        .select('participant_id, judge_id, total_score')
        .eq('event_id', eventId)
        .eq('madrassa_id', madrassaId)
    ]);

    const grouped = new Map<
      string,
      { codeLetter: string; participantType: 'individual' | 'squad'; scores: { judgeId: string; totalScore: number }[] }
    >();

    const consume = (rows: any[], type: 'individual' | 'squad') => {
      for (const r of rows) {
        const key = `${type}:${r.id}`;
        if (!grouped.has(key)) {
          grouped.set(key, { codeLetter: r.code_letter, participantType: type, scores: [] });
        }
      }
    };

    consume((individualRows as any[]) || [], 'individual');
    consume((squadRows as any[]) || [], 'squad');

    for (const s of (scores as any[]) || []) {
      const keyInd = `individual:${s.participant_id}`;
      const keySq = `squad:${s.participant_id}`;

      const targetKey = grouped.has(keyInd) ? keyInd : (grouped.has(keySq) ? keySq : null);
      if (targetKey && s.total_score !== null) {
        grouped.get(targetKey)!.scores.push({ judgeId: s.judge_id, totalScore: Number(s.total_score) });
      }
    }

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
