#!/usr/bin/env node
import { render } from 'ink';
import { App } from '../ui/app.js';
import type { View, AppConfig } from '../ui/app.js';

const argv = process.argv.slice(2);
const command = argv[0] && !argv[0].startsWith('-') ? argv[0] : undefined;

const portIndex = argv.indexOf('--port');
const config: AppConfig = {
  port: portIndex !== -1 ? Number(argv[portIndex + 1]) : 3456,
  open: !argv.includes('--no-open'),
  dryRun: argv.includes('--dry-run'),
  autoYes: argv.includes('--yes') || argv.includes('-y'),
};

function resolveInitialView(): View {
  if (argv.includes('--help') || argv.includes('-h') || command === 'help') {
    return { kind: 'help' };
  }
  switch (command) {
    case 'run': {
      const file = argv[1] && !argv[1].startsWith('-') ? argv[1] : undefined;
      return file ? { kind: 'run', file } : { kind: 'run-picker' };
    }
    case 'init':
      return { kind: 'init' };
    case 'daemon':
      return { kind: 'daemon' };
    case 'catalog':
      return { kind: 'catalog' };
    default:
      return { kind: 'home' };
  }
}

const { waitUntilExit } = render(<App initial={resolveInitialView()} config={config} />);
waitUntilExit().catch(() => {
  process.exitCode = 1;
});
