import { jsonSchema } from 'ai';
import type { Tool } from 'ai';
import { agent, provide } from '@fabster/core';

const readFileTool: Tool<{ path: string }, string> = {
  description: 'Read the contents of a file. Returns the file content as a string.',
  inputSchema: jsonSchema<{ path: string }>({
    type: 'object',
    properties: { path: { type: 'string' } },
    required: ['path'],
  }),
  execute: async ({ path }) => `[readFile: ${path}]`,
};

const writeFileTool: Tool<{ path: string; content: string }, string> = {
  description: 'Write content to a file. Creates the file and any parent directories if they do not exist. Always provide the COMPLETE file content.',
  inputSchema: jsonSchema<{ path: string; content: string }>({
    type: 'object',
    properties: {
      path: { type: 'string' },
      content: { type: 'string' },
    },
    required: ['path', 'content'],
  }),
  execute: async ({ path }) => `[writeFile: ${path}]`,
};

const listDirectoryTool: Tool<{ path: string }, string> = {
  description: 'List files and directories at a path. Returns a newline-separated list.',
  inputSchema: jsonSchema<{ path: string }>({
    type: 'object',
    properties: { path: { type: 'string' } },
    required: ['path'],
  }),
  execute: async ({ path }) => `[listDirectory: ${path}]`,
};

const runCommandTool: Tool<{ command: string }, string> = {
  description: 'Run a shell command in the workspace. Returns stdout, stderr, and exit code. Use for npm install, nx build, nx test, etc.',
  inputSchema: jsonSchema<{ command: string }>({
    type: 'object',
    properties: { command: { type: 'string' } },
    required: ['command'],
  }),
  execute: async ({ command }) => `[runCommand: ${command}]`,
};

export const nxDeveloper = agent('nx-developer', {
  purpose: 'Full-stack developer for Nx monorepo projects',
  capabilities: [
    provide('agent.skill', { name: 'code-generation', language: 'typescript' }),
    provide('agent.skill', { name: 'testing' }),
    provide('agent.skill', { name: 'react' }),
    provide('agent.skill', { name: 'refactoring' }),
    provide('agent.skill', { name: 'openapi' }),
  ],
  instructions: `You are an expert full-stack developer working in an Nx monorepo.

IMPORTANT: You MUST use the provided tools to complete tasks. Do NOT just describe what you would do — actually do it by calling tools. Every task requires you to write files, run commands, or both.

Your workflow for every task:
1. First, use listDirectory and readFile to understand the current project structure
2. Then, use writeFile to create or modify files with COMPLETE file content
3. Finally, use runCommand to verify your changes compile and tests pass

Tool usage rules:
- Always provide COMPLETE file content to writeFile, never partial snippets
- Use absolute paths from the workspace root (e.g. /repo/packages/my-lib/src/index.ts)
- After writing files, run "npx nx build <project>" to verify compilation
- After writing tests, run "npx nx test <project>" to verify they pass
- If a build or test fails, read the error output, fix the issue, and retry

Code quality:
- Follow TypeScript best practices and the project's existing code style
- Write unit tests for all new functionality
- Export public APIs from index.ts barrel files
- Use proper types, no "any" unless absolutely necessary`,
  tools: {
    readFile: readFileTool,
    writeFile: writeFileTool,
    listDirectory: listDirectoryTool,
    runCommand: runCommandTool,
  },
});
