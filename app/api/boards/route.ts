import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const { title, destination, window_start, window_end, creator_name } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [board] = await sql`
    INSERT INTO boards (title, destination, window_start, window_end, user_id)
    VALUES (${title.trim()}, ${destination?.trim() || null}, ${window_start || null}, ${window_end || null}, ${user?.id || null})
    RETURNING id, creator_token
  `;

  // Auto-join creator as a member if they gave a name
  if (creator_name?.trim()) {
    await sql`
      INSERT INTO board_members (board_id, name, participant_token)
      VALUES (${board.id}, ${creator_name.trim()}, ${board.creator_token})
    `;
  }

  return NextResponse.json({ id: board.id, creator_token: board.creator_token });
}
