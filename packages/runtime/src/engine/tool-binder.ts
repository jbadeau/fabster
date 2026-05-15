import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import type { ToolSet } from 'ai';
import type { Workspace } from '@struktoai/mirage-core';
import { wrapWithMise } from './mise.js';

/**
 * Rebinds agent tool execute functions to use a real Mirage workspace.
 * All shell commands are wrapped with `mise exec` for tool provisioning.
 */
export function bindToolsToWorkspace(
  tools: ToolSet,
  workspace: Workspace,
  diskRoot?: string,
): ToolSet {
  const bound: Record<string, unknown> = {};

  for (const [name, tool] of Object.entries(tools)) {
    const toolCopy = { ...tool };

    switch (name) {
      case 'readFile':
        toolCopy.execute = async (args: { path: string }) => {
          const result = await workspace.execute(`cat "${args.path}"`);
          if (result.exitCode !== 0) {
            return `Error reading ${args.path}: ${result.stderrText}`;
          }
          return result.stdoutText;
        };
        break;

      case 'writeFile':
        toolCopy.execute = async (args: { path: string; content: string }) => {
          if (diskRoot) {
            // Resolve /repo/... paths to real disk paths
            const resolvedPath = args.path.startsWith('/repo/')
              ? path.join(diskRoot, args.path.slice(6))
              : path.join(diskRoot, args.path);
            await mkdir(path.dirname(resolvedPath), { recursive: true });
            await writeFile(resolvedPath, args.content, 'utf-8');
          } else {
            const dir = args.path.substring(0, args.path.lastIndexOf('/'));
            if (dir) {
              await workspace.execute(`mkdir -p "${dir}"`);
            }
            const encoder = new TextEncoder();
            await workspace.execute(`tee "${args.path}"`, {
              stdin: encoder.encode(args.content),
            });
          }
          return `Written ${args.path}`;
        };
        break;

      case 'listDirectory':
        toolCopy.execute = async (args: { path: string }) => {
          const result = await workspace.execute(`ls -la "${args.path}"`);
          if (result.exitCode !== 0) {
            return `Error listing ${args.path}: ${result.stderrText}`;
          }
          return result.stdoutText;
        };
        break;

      case 'runCommand':
        toolCopy.execute = async (args: { command: string }) => {
          const wrapped = wrapWithMise(args.command);
          const result = await workspace.execute(wrapped);
          const output = [result.stdoutText, result.stderrText]
            .filter(Boolean)
            .join('\n');
          return `Exit code: ${result.exitCode}\n${output}`;
        };
        break;

      default:
        break;
    }

    bound[name] = toolCopy;
  }

  return bound as ToolSet;
}
