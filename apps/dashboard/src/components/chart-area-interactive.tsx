"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"

export const description = "An interactive area chart"

const chartData = [
  { date: "2026-03-01", succeeded: 2, failed: 0 },
  { date: "2026-03-02", succeeded: 1, failed: 1 },
  { date: "2026-03-03", succeeded: 3, failed: 0 },
  { date: "2026-03-04", succeeded: 0, failed: 0 },
  { date: "2026-03-05", succeeded: 2, failed: 0 },
  { date: "2026-03-06", succeeded: 1, failed: 0 },
  { date: "2026-03-07", succeeded: 4, failed: 1 },
  { date: "2026-03-08", succeeded: 2, failed: 0 },
  { date: "2026-03-09", succeeded: 0, failed: 0 },
  { date: "2026-03-10", succeeded: 3, failed: 0 },
  { date: "2026-03-11", succeeded: 1, failed: 1 },
  { date: "2026-03-12", succeeded: 2, failed: 0 },
  { date: "2026-03-13", succeeded: 5, failed: 0 },
  { date: "2026-03-14", succeeded: 3, failed: 1 },
  { date: "2026-03-15", succeeded: 1, failed: 0 },
  { date: "2026-03-16", succeeded: 0, failed: 0 },
  { date: "2026-03-17", succeeded: 2, failed: 0 },
  { date: "2026-03-18", succeeded: 4, failed: 0 },
  { date: "2026-03-19", succeeded: 1, failed: 1 },
  { date: "2026-03-20", succeeded: 3, failed: 0 },
  { date: "2026-03-21", succeeded: 2, failed: 0 },
  { date: "2026-03-22", succeeded: 0, failed: 0 },
  { date: "2026-03-23", succeeded: 1, failed: 0 },
  { date: "2026-03-24", succeeded: 3, failed: 0 },
  { date: "2026-03-25", succeeded: 2, failed: 1 },
  { date: "2026-03-26", succeeded: 4, failed: 0 },
  { date: "2026-03-27", succeeded: 1, failed: 0 },
  { date: "2026-03-28", succeeded: 2, failed: 0 },
  { date: "2026-03-29", succeeded: 3, failed: 0 },
  { date: "2026-03-30", succeeded: 0, failed: 0 },
  { date: "2026-04-01", succeeded: 2, failed: 0 },
  { date: "2026-04-02", succeeded: 3, failed: 0 },
  { date: "2026-04-03", succeeded: 1, failed: 1 },
  { date: "2026-04-04", succeeded: 4, failed: 0 },
  { date: "2026-04-05", succeeded: 2, failed: 0 },
  { date: "2026-04-06", succeeded: 0, failed: 0 },
  { date: "2026-04-07", succeeded: 3, failed: 0 },
  { date: "2026-04-08", succeeded: 5, failed: 1 },
  { date: "2026-04-09", succeeded: 2, failed: 0 },
  { date: "2026-04-10", succeeded: 1, failed: 0 },
  { date: "2026-04-11", succeeded: 3, failed: 0 },
  { date: "2026-04-12", succeeded: 2, failed: 0 },
  { date: "2026-04-13", succeeded: 0, failed: 0 },
  { date: "2026-04-14", succeeded: 4, failed: 0 },
  { date: "2026-04-15", succeeded: 1, failed: 1 },
  { date: "2026-04-16", succeeded: 3, failed: 0 },
  { date: "2026-04-17", succeeded: 2, failed: 0 },
  { date: "2026-04-18", succeeded: 5, failed: 0 },
  { date: "2026-04-19", succeeded: 1, failed: 0 },
  { date: "2026-04-20", succeeded: 0, failed: 0 },
  { date: "2026-04-21", succeeded: 2, failed: 0 },
  { date: "2026-04-22", succeeded: 3, failed: 0 },
  { date: "2026-04-23", succeeded: 4, failed: 1 },
  { date: "2026-04-24", succeeded: 2, failed: 0 },
  { date: "2026-04-25", succeeded: 1, failed: 0 },
  { date: "2026-04-26", succeeded: 3, failed: 0 },
  { date: "2026-04-27", succeeded: 0, failed: 0 },
  { date: "2026-04-28", succeeded: 2, failed: 0 },
  { date: "2026-04-29", succeeded: 4, failed: 0 },
  { date: "2026-04-30", succeeded: 3, failed: 1 },
  { date: "2026-05-01", succeeded: 2, failed: 0 },
  { date: "2026-05-02", succeeded: 1, failed: 0 },
  { date: "2026-05-03", succeeded: 3, failed: 0 },
  { date: "2026-05-04", succeeded: 0, failed: 0 },
  { date: "2026-05-05", succeeded: 4, failed: 0 },
  { date: "2026-05-06", succeeded: 2, failed: 1 },
  { date: "2026-05-07", succeeded: 3, failed: 0 },
  { date: "2026-05-08", succeeded: 1, failed: 0 },
  { date: "2026-05-09", succeeded: 5, failed: 0 },
  { date: "2026-05-10", succeeded: 2, failed: 0 },
  { date: "2026-05-11", succeeded: 0, failed: 0 },
  { date: "2026-05-12", succeeded: 3, failed: 0 },
  { date: "2026-05-13", succeeded: 2, failed: 0 },
  { date: "2026-05-14", succeeded: 4, failed: 1 },
  { date: "2026-05-15", succeeded: 3, failed: 0 },
  { date: "2026-05-16", succeeded: 2, failed: 0 },
  { date: "2026-05-17", succeeded: 1, failed: 0 },
]

const chartConfig = {
  runs: {
    label: "Runs",
  },
  succeeded: {
    label: "Succeeded",
    color: "var(--primary)",
  },
  failed: {
    label: "Failed",
    color: "var(--destructive)",
  },
} satisfies ChartConfig

export function ChartAreaInteractive() {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState("90d")

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d")
    }
  }, [isMobile])

  const filteredData = chartData.filter((item) => {
    const date = new Date(item.date)
    const referenceDate = new Date("2026-05-17")
    let daysToSubtract = 90
    if (timeRange === "30d") {
      daysToSubtract = 30
    } else if (timeRange === "7d") {
      daysToSubtract = 7
    }
    const startDate = new Date(referenceDate)
    startDate.setDate(startDate.getDate() - daysToSubtract)
    return date >= startDate
  })

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Job Runs</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Succeeded vs failed runs over time
          </span>
          <span className="@[540px]/card:hidden">Run history</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            multiple={false}
            value={timeRange ? [timeRange] : []}
            onValueChange={(value) => {
              setTimeRange(value[0] ?? "90d")
            }}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">Last 3 months</ToggleGroupItem>
            <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
            <ToggleGroupItem value="7d">Last 7 days</ToggleGroupItem>
          </ToggleGroup>
          <Select
            value={timeRange}
            onValueChange={(value) => {
              if (value !== null) {
                setTimeRange(value)
              }
            }}
          >
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select a value"
            >
              <SelectValue placeholder="Last 3 months" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                Last 3 months
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Last 30 days
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                Last 7 days
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillSucceeded" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-succeeded)"
                  stopOpacity={1.0}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-succeeded)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillFailed" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-failed)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-failed)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="failed"
              type="natural"
              fill="url(#fillFailed)"
              stroke="var(--color-failed)"
              stackId="a"
            />
            <Area
              dataKey="succeeded"
              type="natural"
              fill="url(#fillSucceeded)"
              stroke="var(--color-succeeded)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
