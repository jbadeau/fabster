import { jsonSchema } from 'ai';
import type { Tool } from 'ai';
import { agent, provide } from '@fabster/core';

const readFileTool: Tool<{ path: string }, string> = {
  description: 'Read the contents of a file',
  inputSchema: jsonSchema<{ path: string }>({
    type: 'object',
    properties: { path: { type: 'string' } },
    required: ['path'],
  }),
  execute: async ({ path }) => `[readFile: ${path}]`,
};

const writeFileTool: Tool<{ path: string; content: string }, string> = {
  description: 'Write content to a file, creating it if it does not exist',
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
  description: 'List files and directories at a path',
  inputSchema: jsonSchema<{ path: string }>({
    type: 'object',
    properties: { path: { type: 'string' } },
    required: ['path'],
  }),
  execute: async ({ path }) => `[listDirectory: ${path}]`,
};

const runCommandTool: Tool<{ command: string }, string> = {
  description: 'Run a shell command in the workspace',
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
  ],
  instructions: `You are an expert full-stack developer working in an Nx monorepo.

Your workspace is a Mirage virtual filesystem. Use the provided tools to read files, write files, list directories, and run commands.

Guidelines:
- Read existing code before making changes to understand patterns and conventions
- Follow the project's existing code style
- Write tests for all new functionality
- Ensure code compiles and tests pass before finishing
- Use Nx conventions for project structure
- Export public APIs from index.ts barrel files`,
  tools: {
    readFile: readFileTool,
    writeFile: writeFileTool,
    listDirectory: listDirectoryTool,
    runCommand: runCommandTool,
  },
});
