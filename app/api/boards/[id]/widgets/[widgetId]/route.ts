import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; widgetId: string }> }) {
  const { id: board_id, widgetId } = await params;
  const body = await req.json();
  const { participant_token } = body;

  const [member] = await sql`SELECT id FROM board_members WHERE board_id = ${board_id} AND participant_token = ${participant_token}`;
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  if (body.data !== undefined) {
    await sql`UPDATE board_widgets SET data = ${JSON.stringify(body.data)} WHERE id = ${widgetId} AND board_id = ${board_id}`;
  }

  if (typeof body.position === 'number') {
    await sql`UPDATE board_widgets SET position = ${body.position} WHERE id = ${widgetId} AND board_id = ${board_id}`;
  }

  const [widget] = await sql`SELECT * FROM board_widgets WHERE id = ${widgetId}`;
  return NextResponse.json({ widget });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; widgetId: string }> }) {
  const { id: board_id, widgetId } = await params;
  const { participant_token } = await req.json();

  const [member] = await sql`SELECT id FROM board_members WHERE board_id = ${board_id} AND participant_token = ${participant_token}`;
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  await sql`DELETE FROM board_widgets WHERE id = ${widgetId} AND board_id = ${board_id}`;
  return NextResponse.json({ success: true });
}
