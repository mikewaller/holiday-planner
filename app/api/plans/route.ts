import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import sql from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const { name, window_start, window_end, min_duration, max_duration } = await req.json();

  if (!name || !window_start || !window_end || !min_duration || !max_duration) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Attach user_id if logged in (soft auth — optional)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const id = uuidv4().slice(0, 8);
  const creator_token = uuidv4();

  await sql`
    INSERT INTO plans (id, name, window_start, window_end, min_duration, max_duration, creator_token, user_id)
    VALUES (${id}, ${name}, ${window_start}, ${window_end}, ${min_duration}, ${max_duration}, ${creator_token}, ${user?.id ?? null})
  `;

  return NextResponse.json({ id, creator_token });
}
