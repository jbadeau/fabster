import { useLocation } from "react-router"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

const ROUTE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/workflows": "Workflows",
  "/workflow": "Workflow",
  "/agents": "Agents",
  "/catalog/workflows": "Workflows",
  "/catalog/tasks": "Tasks",
  "/catalog/commands": "Commands",
  "/catalog/skills": "Skills",
  "/catalog/rules": "Rules",
  "/settings": "Settings",
  "/search": "Search",
  "/help": "Help",
}

export function SiteHeader() {
  const { pathname } = useLocation()
  const title = ROUTE_TITLES[pathname] ?? (pathname.startsWith("/workflow/") ? "Workflow" : "Dashboard")

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 h-4 data-vertical:self-auto"
        />
        <h1 className="text-base font-medium">{title}</h1>
      </div>
    </header>
  )
}
