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

  const { creator_token, user_id: _uid, ...safePlan } = plan;

  return NextResponse.json({
    plan: safePlan,
    participants,
    availability,
    ...(isOwner ? { creator_token } : {}),
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
  const { creator_token, is_locked } = await req.json();

  const [plan] = await sql<PlanRow[]>`SELECT * FROM plans WHERE id = ${id}`;
  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  if (plan.creator_token !== creator_token) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  await sql`UPDATE plans SET is_locked = ${is_locked ? 1 : 0} WHERE id = ${id}`;
  return NextResponse.json({ success: true });
}
