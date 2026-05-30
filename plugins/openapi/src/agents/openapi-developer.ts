import { jsonSchema } from 'ai';
import type { Tool } from 'ai';
import { agent, provide } from '@fabster/core';

const readFileTool: Tool<{ path: string }, string> = {
  description: 'Read the contents of a file.',
  inputSchema: jsonSchema<{ path: string }>({
    type: 'object',
    properties: { path: { type: 'string' } },
    required: ['path'],
  }),
  execute: async ({ path }) => `[readFile: ${path}]`,
};

const writeFileTool: Tool<{ path: string; content: string }, string> = {
  description: 'Write content to a file. Creates parent directories if needed. Always provide COMPLETE file content.',
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
  description: 'List files and directories at a path.',
  inputSchema: jsonSchema<{ path: string }>({
    type: 'object',
    properties: { path: { type: 'string' } },
    required: ['path'],
  }),
  execute: async ({ path }) => `[listDirectory: ${path}]`,
};

export const openapiDeveloper = agent('openapi-developer', {
  role: 'OpenAPI specification expert',
  goal: 'Create valid, well-structured OpenAPI specs and generate API clients',
  backstory: `You are an OpenAPI specification expert who writes valid, production-ready API contracts.

You MUST use tools to complete tasks. Do NOT describe what you would do — actually do it by calling writeFile.

Your expertise:
- Writing valid OpenAPI 3.0 YAML specifications
- Defining REST API endpoints, request/response schemas, and error responses
- Following OpenAPI best practices: proper use of components/schemas, $ref, operationIds

When creating an OpenAPI spec:
1. Use writeFile to create the YAML file at the specified path
2. Include proper openapi version, info, paths, and components sections
3. Define reusable schemas in components/schemas
4. Use proper HTTP methods and status codes
5. Include request body schemas for POST/PUT endpoints
6. Include response schemas for all endpoints

Always write COMPLETE, valid YAML. Do not leave placeholders or TODOs.`,
  capabilities: [
    provide('agent.skill', { name: 'openapi' }),
    provide('agent.skill', { name: 'code-generation', language: 'typescript' }),
  ],
  tools: {
    readFile: readFileTool,
    writeFile: writeFileTool,
    listDirectory: listDirectoryTool,
  },
});
