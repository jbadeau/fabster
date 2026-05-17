#!/usr/bin/env node

import { run } from '../run.js';

const args = process.argv.slice(2);
const command = args[0];

if (command === 'help' || command === '--help') {
  console.log(`
fabster - workflow automation for fabricating code

Usage:
  fabster                         Start daemon + open dashboard
  fabster run <workflow-file>     Run a workflow via CLI
  fabster help                    Show this help message

Options:
  --port <port>                   Daemon port (default: 3456)
  --no-open                       Don't open browser automatically
  --dry-run                       Validate without executing (for run)
`);
  process.exit(0);
}

if (command === 'run') {
  const workflowFile = args[1];
  if (!workflowFile) {
    console.error('Error: workflow file path required');
    console.error('Usage: fabster run <workflow-file>');
    process.exit(1);
  }

  const dryRun = args.includes('--dry-run');

  run(workflowFile, { dryRun }).catch((err: Error) => {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  });
} else {
  // Default: start daemon + open dashboard
  const portIndex = args.indexOf('--port');
  const port = portIndex !== -1 ? Number(args[portIndex + 1]) : 3456;
  const noOpen = args.includes('--no-open');

  import('@fabster/server').then(({ startServer }) => {
    startServer({ port, open: !noOpen });
  }).catch((err: Error) => {
    console.error(`Error starting daemon: ${err.message}`);
    process.exit(1);
  });
}
