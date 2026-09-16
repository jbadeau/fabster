import { trpc } from "@/lib/trpc"
import { computeMetrics } from "@/lib/runs"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function SectionCards() {
  const { data } = trpc.listRuns.useQuery()
  const runs = data?.runs ?? []
  const m = computeMetrics(runs)

  const succeeded = m.byStatus["success"] ?? 0
  const failed = m.byStatus["failed"] ?? 0
  const gated = m.byStatus["gated"] ?? 0
  const running = m.byStatus["running"] ?? 0

  return (
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Runs</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {m.total}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {succeeded} succeeded · {failed} failed
          </div>
          <div className="text-muted-foreground">
            {gated} gated · {running} running
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Pass Rate</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {m.passRate === null ? "—" : `${Math.round(m.passRate * 100)}%`}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {succeeded} of {m.total - running} terminal runs succeeded
          </div>
          <div className="text-muted-foreground">
            Excludes in-progress runs
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Nodes Executed</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {m.nodesExecuted}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Completed across {m.total} run{m.total === 1 ? "" : "s"}
          </div>
          <div className="text-muted-foreground">
            {m.agents.length > 0
              ? `Agents: ${m.agents.join(", ")}`
              : "No agentic tasks executed yet"}
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Avg Run Duration</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {m.avgDuration ?? "—"}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Mean over finished runs
          </div>
          <div className="text-muted-foreground">
            Measured from start to completion
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
