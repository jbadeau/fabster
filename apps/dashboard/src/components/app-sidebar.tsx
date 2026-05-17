import * as React from "react"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { PenLineIcon, PlayIcon, BotIcon, LayoutDashboardIcon, ListIcon, ClipboardListIcon, SparklesIcon, ShieldCheckIcon, Settings2Icon, CircleHelpIcon, SearchIcon, HexagonIcon } from "lucide-react"

const data = {
  user: {
    name: "jbadeau",
    email: "jose.badeau@gmail.com",
    avatar: "",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/",
      icon: (
        <LayoutDashboardIcon />
      ),
    },
    {
      title: "Compose",
      url: "/compose",
      icon: (
        <PenLineIcon />
      ),
    },
    {
      title: "Runs",
      url: "/runs",
      icon: (
        <PlayIcon />
      ),
    },
    {
      title: "Agents",
      url: "/agents",
      icon: (
        <BotIcon />
      ),
    },
  ],
  catalog: [
    {
      name: "Workflows",
      url: "/catalog/workflows",
      icon: (
        <ListIcon />
      ),
    },
    {
      name: "Tasks",
      url: "/catalog/tasks",
      icon: (
        <ClipboardListIcon />
      ),
    },
    {
      name: "Skills",
      url: "/catalog/skills",
      icon: (
        <SparklesIcon />
      ),
    },
    {
      name: "Rules",
      url: "/catalog/rules",
      icon: (
        <ShieldCheckIcon />
      ),
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: (
        <Settings2Icon />
      ),
    },
    {
      title: "Get Help",
      url: "#",
      icon: (
        <CircleHelpIcon />
      ),
    },
    {
      title: "Search",
      url: "#",
      icon: (
        <SearchIcon />
      ),
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              render={<a href="#" />}
            >
              <HexagonIcon className="size-5!" />
              <span className="text-base font-semibold">Fabster</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.catalog} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
