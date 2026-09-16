/**
 * Demo stand-in for the production fixer agent. In production the fixer is
 * `supportFixer` from @fabster/support (claude CLI); this scripted agent
 * applies the known fix deterministically so the example runs end-to-end
 * with no API access — while still honoring the outputs contract by writing
 * .fabster/outputs.json.
 */
import { externalAgent, provide, type ExternalAgentDefinition } from '@fabster/core';

export function demoFixerAgent(): ExternalAgentDefinition {
  const script = [
    "process.stdin.resume();",
    "process.stdin.on('end', () => {",
    "  const fs = require('node:fs');",
    "  const source = fs.readFileSync('service.js', 'utf8');",
    "  fs.writeFileSync('service.js', source.replace('a - b', 'a + b'));",
    "  fs.mkdirSync('.fabster', { recursive: true });",
    "  fs.writeFileSync('.fabster/outputs.json', JSON.stringify({ summary: 'Corrected add() to sum its arguments instead of subtracting' }));",
    "  console.log('fix applied');",
    "});",
  ].join('\n');

  return externalAgent('demo-fixer', {
    role: 'Scripted stand-in for the support fixer agent',
    goal: 'Apply the approved fix deterministically for the demo',
    backstory: 'Reads the prompt from stdin and applies the known fix.',
    capabilities: [provide('agent.skill', { name: 'code-fix' })],
    adapter: {
      kind: 'command',
      command: process.execPath,
      args: ['-e', script],
    },
  });
}
