import * as React from "react"

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
import { PenLineIcon, PlayIcon, BotIcon, LayoutDashboardIcon, Settings2Icon, CircleHelpIcon, SearchIcon, HexagonIcon } from "lucide-react"

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
      title: "Composer",
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
    {
      title: "Agents",
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
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
