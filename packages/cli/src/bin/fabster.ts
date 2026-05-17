#!/usr/bin/env node

import { run } from '../run.js';

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === 'help' || command === '--help') {
  console.log(`
fabster - workflow automation for fabricating code

Usage:
  fabster daemon                  Start the fabster daemon (API + dashboard)
  fabster run <workflow-file>     Run a workflow definition
  fabster help                    Show this help message

Options:
  --port <port>                   Daemon port (default: 3456)
  --dry-run                       Validate without executing
`);
  process.exit(0);
}

if (command === 'daemon') {
  const portIndex = args.indexOf('--port');
  const port = portIndex !== -1 ? Number(args[portIndex + 1]) : 3456;

  import('@fabster/server').then(({ startServer }) => {
    startServer({ port });
  }).catch((err: Error) => {
    console.error(`Error starting daemon: ${err.message}`);
    process.exit(1);
  });
} else if (command === 'run') {
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
  console.error(`Unknown command: ${command}`);
  console.error('Run "fabster help" for usage');
  process.exit(1);
}
