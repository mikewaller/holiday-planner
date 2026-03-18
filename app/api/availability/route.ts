import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import sql from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

interface PlanRow { id: string; is_locked: number; }
interface ParticipantRow { id: string; name: string; participant_token: string; user_id: string | null; }

export async function POST(req: NextRequest) {
  const { plan_id, name, participant_token } = await req.json();

  if (!plan_id || !name) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const [plan] = await sql<PlanRow[]>`SELECT id, is_locked FROM plans WHERE id = ${plan_id}`;
  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  if (plan.is_locked) return NextResponse.json({ error: 'Plan is locked' }, { status: 403 });

  // Get logged-in user if available (optional — anonymous users can still join)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id ?? null;

  if (participant_token) {
    const [existing] = await sql<ParticipantRow[]>`
      SELECT * FROM participants WHERE plan_id = ${plan_id} AND participant_token = ${participant_token}
    `;
    if (existing) {
      // Update user_id if they've since signed in
      if (userId && !existing.user_id) {
        await sql`UPDATE participants SET user_id = ${userId} WHERE id = ${existing.id}`;
      }
      return NextResponse.json({ participant_id: existing.id, participant_token });
    }
  }

  const [nameTaken] = await sql`SELECT id FROM participants WHERE plan_id = ${plan_id} AND name = ${name}`;
  if (nameTaken) {
    return NextResponse.json({ error: 'Name already taken in this plan' }, { status: 409 });
  }

  const id = uuidv4();
  const token = uuidv4();
  await sql`INSERT INTO participants (id, plan_id, name, participant_token, user_id) VALUES (${id}, ${plan_id}, ${name}, ${token}, ${userId})`;

  return NextResponse.json({ participant_id: id, participant_token: token });
}

export async function PUT(req: NextRequest) {
  const { participant_id, participant_token, plan_id, date, status } = await req.json();

  if (!participant_id || !participant_token || !plan_id || !date) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const [plan] = await sql<PlanRow[]>`SELECT id, is_locked FROM plans WHERE id = ${plan_id}`;
  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  if (plan.is_locked) return NextResponse.json({ error: 'Plan is locked' }, { status: 403 });

  const [participant] = await sql`
    SELECT id FROM participants WHERE id = ${participant_id} AND participant_token = ${participant_token}
  `;
  if (!participant) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  if (!status) {
    await sql`DELETE FROM availability WHERE participant_id = ${participant_id} AND date = ${date}`;
  } else {
    await sql`
      INSERT INTO availability (id, participant_id, plan_id, date, status)
      VALUES (${uuidv4()}, ${participant_id}, ${plan_id}, ${date}, ${status})
      ON CONFLICT (participant_id, date) DO UPDATE SET status = EXCLUDED.status
    `;
  }

  return NextResponse.json({ success: true });
}
