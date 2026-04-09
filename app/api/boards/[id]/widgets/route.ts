import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: board_id } = await params;
  const { type, data, participant_token } = await req.json();
  if (!type) return NextResponse.json({ error: 'Type required' }, { status: 400 });

  // Verify member
  const [member] = await sql`SELECT id FROM board_members WHERE board_id = ${board_id} AND participant_token = ${participant_token}`;
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  // Place at end
  const [{ max_pos }] = await sql`SELECT COALESCE(MAX(position), -1) as max_pos FROM board_widgets WHERE board_id = ${board_id}`;

  const [widget] = await sql`
    INSERT INTO board_widgets (board_id, type, data, position, created_by)
    VALUES (${board_id}, ${type}, ${JSON.stringify(data ?? {})}, ${Number(max_pos) + 1}, ${participant_token})
    RETURNING *
  `;

  return NextResponse.json({ widget });
}
