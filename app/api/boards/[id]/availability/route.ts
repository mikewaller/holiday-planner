import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: board_id } = await params;
  const widget_id = req.nextUrl.searchParams.get('widget_id');
  if (!widget_id) return NextResponse.json({ error: 'Missing widget_id' }, { status: 400 });

  const availability = await sql`
    SELECT member_id, date, status FROM board_availability
    WHERE widget_id = ${widget_id} AND board_id = ${board_id}
  `;

  return NextResponse.json({ availability });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: board_id } = await params;
  const { widget_id, participant_token, date, status } = await req.json();

  if (!widget_id || !participant_token || !date) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const [member] = await sql`
    SELECT id FROM board_members WHERE board_id = ${board_id} AND participant_token = ${participant_token}
  `;
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  if (!status) {
    await sql`
      DELETE FROM board_availability
      WHERE widget_id = ${widget_id} AND member_id = ${member.id} AND date = ${date}
    `;
  } else {
    await sql`
      INSERT INTO board_availability (board_id, widget_id, member_id, date, status)
      VALUES (${board_id}, ${widget_id}, ${member.id}, ${date}, ${status})
      ON CONFLICT (widget_id, member_id, date) DO UPDATE SET status = ${status}
    `;
  }

  return NextResponse.json({ success: true });
}
