import { useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { SectionCards } from '@/components/section-cards';
import { ChartAreaInteractive } from '@/components/chart-area-interactive';
import { DataTable } from '@/components/data-table';
import { toTableRow } from '@/lib/runs';

export function DashboardPage() {
  const { data } = trpc.listRuns.useQuery();
  const rows = useMemo(() => {
    const runs = data?.runs ?? [];
    return [...runs]
      .sort((a, b) => b.startedAt - a.startedAt)
      .map(toTableRow);
  }, [data]);

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <SectionCards />
      <div className="px-4 lg:px-6">
        <ChartAreaInteractive />
      </div>
      <DataTable data={rows} />
    </div>
  );
}
