import { Metadata } from 'next';
import sql from '@/lib/db';

interface PlanRow {
  name: string;
  window_start: string;
  window_end: string;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const [plan] = await sql<PlanRow[]>`SELECT name, window_start, window_end FROM plans WHERE id = ${id}`;

  if (!plan) {
    return { title: 'Trip Plan · Hatch a Plan' };
  }

  const dateRange = `${formatDate(plan.window_start)} – ${formatDate(plan.window_end)}`;
  const title = `${plan.name} · Hatch a Plan`;
  const description = `Join ${plan.name} (${dateRange}) — mark your availability and find dates that work for everyone.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default function PlanLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
