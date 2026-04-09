import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: board_id } = await params;
  const widget_id = req.nextUrl.searchParams.get('widget_id');
  if (!widget_id) return NextResponse.json({ error: 'Missing widget_id' }, { status: 400 });

  const reactions = await sql`
    SELECT card_id, member_id, emoji FROM itinerary_reactions
    WHERE widget_id = ${widget_id} AND board_id = ${board_id}
  `;

  return NextResponse.json({ reactions });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: board_id } = await params;
  const { widget_id, card_id, emoji, participant_token } = await req.json();

  if (!widget_id || !card_id || !emoji || !participant_token) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const [member] = await sql`
    SELECT id FROM board_members WHERE board_id = ${board_id} AND participant_token = ${participant_token}
  `;
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  // Toggle: if exists delete, if not insert
  const [existing] = await sql`
    SELECT id FROM itinerary_reactions
    WHERE widget_id = ${widget_id} AND card_id = ${card_id} AND member_id = ${member.id} AND emoji = ${emoji}
  `;

  if (existing) {
    await sql`DELETE FROM itinerary_reactions WHERE id = ${existing.id}`;
  } else {
    await sql`
      INSERT INTO itinerary_reactions (board_id, widget_id, card_id, member_id, emoji)
      VALUES (${board_id}, ${widget_id}, ${card_id}, ${member.id}, ${emoji})
    `;
  }

  return NextResponse.json({ success: true, action: existing ? 'removed' : 'added' });
}
