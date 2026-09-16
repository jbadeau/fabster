import { useState } from 'react';
import { useApp } from 'ink';
import { Home, RunPicker } from './views/home.js';
import type { HomeTarget } from './views/home.js';
import { RunView } from './views/run.js';
import { InitView } from './views/init.js';
import { DaemonView } from './views/daemon.js';
import { CatalogView } from './views/catalog.js';
import { HelpView } from './views/help.js';

export type View =
  | { kind: 'home' }
  | { kind: 'run-picker' }
  | { kind: 'run'; file: string }
  | { kind: 'init' }
  | { kind: 'daemon' }
  | { kind: 'catalog' }
  | { kind: 'help' };

export interface AppConfig {
  port: number;
  open: boolean;
  dryRun: boolean;
  autoYes: boolean;
}

export function App({ initial, config }: { initial: View; config: AppConfig }) {
  const app = useApp();
  const [view, setView] = useState<View>(initial);

  // When the app booted straight into a command, leaving that view exits the
  // process. When it booted at the menu, leaving returns to the menu.
  const startedAtHome = initial.kind === 'home';
  const leave = () => (startedAtHome ? setView({ kind: 'home' }) : app.exit());

  switch (view.kind) {
    case 'home':
      return (
        <Home
          onNavigate={(target: HomeTarget) => {
            if (target === 'quit') app.exit();
            else if (target === 'run-picker') setView({ kind: 'run-picker' });
            else setView({ kind: target });
          }}
        />
      );
    case 'run-picker':
      return (
        <RunPicker
          onPick={(file) => setView({ kind: 'run', file })}
          onCancel={leave}
        />
      );
    case 'run':
      return <RunView file={view.file} dryRun={config.dryRun} onExit={leave} />;
    case 'init':
      return <InitView autoYes={config.autoYes} onExit={leave} />;
    case 'daemon':
      return <DaemonView port={config.port} open={config.open} onExit={leave} />;
    case 'catalog':
      return <CatalogView onExit={leave} />;
    case 'help':
      return <HelpView onExit={leave} />;
  }
}
