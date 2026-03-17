import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

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
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [plan] = await sql<PlanRow[]>`SELECT * FROM plans WHERE id = ${id}`;
  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });

  const participants = await sql`SELECT id, name, participant_token FROM participants WHERE plan_id = ${id}`;
  const availability = await sql`SELECT * FROM availability WHERE plan_id = ${id}`;

  const { creator_token: _, ...safePlan } = plan;

  return NextResponse.json({ plan: safePlan, participants, availability });
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
