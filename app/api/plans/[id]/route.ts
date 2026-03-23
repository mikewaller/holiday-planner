import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

interface PlanRow {
  id: string;
  name: string;
  window_start: string;
  window_end: string;
  min_duration: number;
  max_duration: number;
  creator_token: string;
  is_locked: number;
  created_at: string;
  user_id: string | null;
  last_activity_at: string | null;
  message: string | null;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [plan] = await sql<PlanRow[]>`SELECT * FROM plans WHERE id = ${id}`;
  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });

  const participants = await sql`SELECT id, name, participant_token FROM participants WHERE plan_id = ${id}`;
  const availability = await sql`SELECT * FROM availability WHERE plan_id = ${id}`;

  // Return creator_token if the requesting user owns this plan
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isOwner = user && plan.user_id && user.id === plan.user_id;

  // Record view and get last_viewed_at for owner
  let lastViewedAt: string | null = null;
  if (isOwner) {
    const [existing] = await sql`SELECT viewed_at FROM plan_views WHERE plan_id = ${id} AND user_id = ${user!.id}`;
    lastViewedAt = existing?.viewed_at ?? null;
    await sql`
      INSERT INTO plan_views (plan_id, user_id, viewed_at)
      VALUES (${id}, ${user!.id}, NOW())
      ON CONFLICT (plan_id, user_id) DO UPDATE SET viewed_at = NOW()
    `;
  }

  const { creator_token, user_id: _uid, ...safePlan } = plan;

  return NextResponse.json({
    plan: safePlan,
    participants,
    availability,
    ...(isOwner ? { creator_token, last_viewed_at: lastViewedAt, last_activity_at: plan.last_activity_at } : {}),
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { creator_token } = await req.json();

  const [plan] = await sql<PlanRow[]>`SELECT * FROM plans WHERE id = ${id}`;
  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  if (plan.creator_token !== creator_token) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  await sql`DELETE FROM plans WHERE id = ${id}`;
  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { creator_token } = body;

  const [plan] = await sql<PlanRow[]>`SELECT * FROM plans WHERE id = ${id}`;
  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  if (plan.creator_token !== creator_token) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  if ('is_locked' in body) {
    await sql`UPDATE plans SET is_locked = ${body.is_locked ? 1 : 0} WHERE id = ${id}`;
  }

  if (body.window_start && body.window_end && body.min_duration && body.max_duration) {
    await sql`
      UPDATE plans
      SET window_start = ${body.window_start},
          window_end   = ${body.window_end},
          min_duration = ${body.min_duration},
          max_duration = ${body.max_duration}
      WHERE id = ${id}
    `;
  }

  if ('message' in body) {
    const msg = typeof body.message === 'string' ? body.message.trim().slice(0, 500) : null;
    await sql`UPDATE plans SET message = ${msg || null} WHERE id = ${id}`;
  }

  return NextResponse.json({ success: true });
}
