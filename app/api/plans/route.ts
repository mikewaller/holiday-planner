import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import sql from '@/lib/db';

export async function POST(req: NextRequest) {
  const { name, window_start, window_end, min_duration, max_duration } = await req.json();

  if (!name || !window_start || !window_end || !min_duration || !max_duration) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const id = uuidv4().slice(0, 8);
  const creator_token = uuidv4();

  await sql`
    INSERT INTO plans (id, name, window_start, window_end, min_duration, max_duration, creator_token)
    VALUES (${id}, ${name}, ${window_start}, ${window_end}, ${min_duration}, ${max_duration}, ${creator_token})
  `;

  return NextResponse.json({ id, creator_token });
}
