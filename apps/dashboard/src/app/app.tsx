import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import { TooltipProvider } from '@/components/ui/tooltip';
import { DashboardPage } from '@/pages/dashboard';
import { WorkflowsPage } from '@/pages/workflows';
import { WorkflowPage } from '@/pages/workflow';
import { AgentsPage } from '@/pages/agents';
import { SkillsPage } from '@/pages/skills';
import { SkillDetailPage } from '@/pages/skill-detail';
import { TasksPage } from '@/pages/tasks';
import { TaskDetailPage } from '@/pages/task-detail';
import { CommandsPage } from '@/pages/commands';
import { CommandDetailPage } from '@/pages/command-detail';
import { RulesPage } from '@/pages/rules';
import { RuleDetailPage } from '@/pages/rule-detail';
import { SettingsPage } from '@/pages/settings';
import { SearchPage } from '@/pages/search';
import { HelpPage } from '@/pages/help';

export function App() {
  return (
    <BrowserRouter>
      <TooltipProvider>
        <SidebarProvider>
          <AppSidebar variant="inset" />
          <SidebarInset>
            <SiteHeader />
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="@container/main flex flex-1 flex-col overflow-hidden">
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/workflows" element={<WorkflowsPage />} />
                  <Route path="/workflow" element={<WorkflowPage />} />
                  <Route path="/workflow/:runId" element={<WorkflowPage />} />
                  <Route path="/agents" element={<AgentsPage />} />
                  <Route path="/catalog/skills" element={<SkillsPage />} />
                  <Route path="/catalog/skills/:slug" element={<SkillDetailPage />} />
                  <Route path="/catalog/tasks" element={<TasksPage />} />
                  <Route path="/catalog/tasks/:slug" element={<TaskDetailPage />} />
                  <Route path="/catalog/commands" element={<CommandsPage />} />
                  <Route path="/catalog/commands/:slug" element={<CommandDetailPage />} />
                  <Route path="/catalog/rules" element={<RulesPage />} />
                  <Route path="/catalog/rules/:slug" element={<RuleDetailPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/help" element={<HelpPage />} />
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
