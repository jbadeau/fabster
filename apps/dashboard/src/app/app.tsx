import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import { TooltipProvider } from '@/components/ui/tooltip';
import { DashboardPage } from '@/pages/dashboard';
import { ComposePage } from '@/pages/compose';
import { RunsPage } from '@/pages/runs';
import { RunDetailPage } from '@/pages/run-detail';
import { AgentsPage } from '@/pages/agents';
import { SkillsPage } from '@/pages/skills';
import { TasksPage } from '@/pages/tasks';
import { RulesPage } from '@/pages/rules';

export function App() {
  return (
    <BrowserRouter>
      <TooltipProvider>
        <SidebarProvider>
          <AppSidebar variant="inset" />
          <SidebarInset>
            <SiteHeader />
            <div className="flex flex-1 flex-col">
              <div className="@container/main flex flex-1 flex-col gap-2">
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/compose" element={<ComposePage />} />
                  <Route path="/runs" element={<RunsPage />} />
                  <Route path="/runs/:runId" element={<RunDetailPage />} />
                  <Route path="/agents" element={<AgentsPage />} />
                  <Route path="/catalog/skills" element={<SkillsPage />} />
                  <Route path="/catalog/tasks" element={<TasksPage />} />
                  <Route path="/catalog/rules" element={<RulesPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </div>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </BrowserRouter>
  );
}

export default App;
