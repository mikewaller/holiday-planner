import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [board] = await sql`SELECT * FROM boards WHERE id = ${id}`;
  if (!board) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const members = await sql`SELECT id, name, participant_token FROM board_members WHERE board_id = ${id} ORDER BY joined_at`;
  const widgets = await sql`SELECT * FROM board_widgets WHERE board_id = ${id} ORDER BY position, created_at`;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isOwner = user && board.user_id && user.id === board.user_id;

  const { creator_token, user_id: _uid, ...safeboard } = board;

  return NextResponse.json({
    board: safeboard,
    members,
    widgets,
    ...(isOwner ? { creator_token } : {}),
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { creator_token } = body;

  const [board] = await sql`SELECT * FROM boards WHERE id = ${id}`;
  if (!board) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (board.creator_token !== creator_token) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  if (body.title || body.destination !== undefined || body.window_start !== undefined || body.window_end !== undefined) {
    await sql`
      UPDATE boards SET
        title         = COALESCE(${body.title ?? null}, title),
        destination   = ${body.destination ?? board.destination},
        window_start  = ${body.window_start ?? board.window_start},
        window_end    = ${body.window_end ?? board.window_end}
      WHERE id = ${id}
    `;
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { creator_token } = await req.json();

  const [board] = await sql`SELECT * FROM boards WHERE id = ${id}`;
  if (!board) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (board.creator_token !== creator_token) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  await sql`DELETE FROM boards WHERE id = ${id}`;
  return NextResponse.json({ success: true });
}
