import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: board_id } = await params;
  const { name, participant_token: existing_token } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });

  const [board] = await sql`SELECT id FROM boards WHERE id = ${board_id}`;
  if (!board) return NextResponse.json({ error: 'Board not found' }, { status: 404 });

  // Re-join with existing token if they've been here before
  if (existing_token) {
    const [existing] = await sql`SELECT * FROM board_members WHERE board_id = ${board_id} AND participant_token = ${existing_token}`;
    if (existing) return NextResponse.json({ member: existing });
  }

  // Check name isn't taken
  const [taken] = await sql`SELECT id FROM board_members WHERE board_id = ${board_id} AND lower(name) = lower(${name.trim()})`;
  if (taken) return NextResponse.json({ error: 'Name taken' }, { status: 409 });

  const [member] = await sql`
    INSERT INTO board_members (board_id, name) VALUES (${board_id}, ${name.trim()}) RETURNING *
  `;
  return NextResponse.json({ member });
}
