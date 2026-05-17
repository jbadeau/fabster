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
import { PenLineIcon, PlayIcon, BotIcon, LayoutDashboardIcon, ListIcon, ClipboardListIcon, Settings2Icon, CircleHelpIcon, SearchIcon, HexagonIcon } from "lucide-react"

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "#",
      icon: (
        <LayoutDashboardIcon />
      ),
    },
    {
      title: "Compose",
      url: "#",
      icon: (
        <PenLineIcon />
      ),
    },
    {
      title: "Runs",
      url: "#",
      icon: (
        <PlayIcon />
      ),
    },
  ],
  catalog: [
    {
      name: "Workflows",
      url: "#",
      icon: (
        <ListIcon />
      ),
    },
    {
      name: "Tasks",
      url: "#",
      icon: (
        <ClipboardListIcon />
      ),
    },
    {
      name: "Agents",
      url: "#",
      icon: (
        <BotIcon />
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
