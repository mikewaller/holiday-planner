import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [plans, contributed] = await Promise.all([
    sql<PlanRow[]>`
      SELECT p.*, pv.viewed_at AS last_viewed_at
      FROM plans p
      LEFT JOIN plan_views pv ON pv.plan_id = p.id AND pv.user_id = ${user.id}
      WHERE p.user_id = ${user.id}
      ORDER BY p.created_at DESC
    `,
    sql<PlanRow[]>`
      SELECT DISTINCT p.* FROM plans p
      INNER JOIN participants pt ON pt.plan_id = p.id
      WHERE pt.user_id = ${user.id}
        AND p.user_id != ${user.id}
      ORDER BY p.created_at DESC
    `,
  ]);

  return NextResponse.json({ plans, contributed });
}
